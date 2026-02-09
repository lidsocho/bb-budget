import Papa from 'papaparse';
import { generateId, getMonthKey } from './store';

// Wells Fargo CSV format detection and parsing
// WF Checking typically: Date, Amount, *, *, Description
// WF Credit typically: Date, Amount, Description  
// SoFi typically has headers: Date, Description, Amount, etc.

function detectBank(headers, firstRow) {
  const headerStr = headers.join(',').toLowerCase();
  
  if (headerStr.includes('sofi') || headerStr.includes('posted date')) {
    return 'sofi';
  }
  
  // Wells Fargo CSVs often have no headers or minimal ones
  // Check if first row looks like a date + amount pattern
  if (firstRow && firstRow.length >= 3) {
    const maybeDate = firstRow[0];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(maybeDate)) {
      return 'wells_fargo';
    }
  }
  
  return 'unknown';
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.trim();
  
  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return str;
  
  // Try native parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  
  return null;
}

function parseAmount(amtStr) {
  if (!amtStr && amtStr !== 0) return 0;
  const cleaned = String(amtStr).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseCSV(fileContent, account) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      complete: (results) => {
        try {
          const rows = results.data.filter(r => r.some(cell => cell && cell.trim()));
          if (rows.length === 0) {
            resolve({ transactions: [], latestBalance: null });
            return;
          }
          
          // Check if first row is headers
          const firstRow = rows[0];
          const hasHeaders = firstRow.some(cell => 
            /^(date|description|amount|posted|transaction|type|balance)/i.test(cell?.trim?.() || '')
          );
          
          const dataRows = hasHeaders ? rows.slice(1) : rows;
          const headers = hasHeaders ? firstRow.map(h => h.toLowerCase().trim()) : [];
          
          let transactions = [];
          let latestBalance = null;
          let latestDate = null;
          
          if (hasHeaders && headers.length > 0) {
            // Parse with headers (SoFi style and others)
            const dateIdx = headers.findIndex(h => /date|posted/.test(h));
            const descIdx = headers.findIndex(h => /description|memo|detail|name/.test(h));
            const amountIdx = headers.findIndex(h => /^amount$/.test(h));
            const debitIdx = headers.findIndex(h => /debit|withdrawal/.test(h));
            const creditIdx = headers.findIndex(h => /credit|deposit/.test(h));
            const balanceIdx = headers.findIndex(h => /balance|running|available/.test(h));
            
            for (const row of dataRows) {
              const date = parseDate(row[dateIdx]);
              if (!date) continue;
              
              let amount;
              if (amountIdx >= 0) {
                amount = parseAmount(row[amountIdx]);
              } else if (debitIdx >= 0 || creditIdx >= 0) {
                const debit = debitIdx >= 0 ? parseAmount(row[debitIdx]) : 0;
                const credit = creditIdx >= 0 ? parseAmount(row[creditIdx]) : 0;
                amount = credit ? Math.abs(credit) : -Math.abs(debit);
              } else {
                continue;
              }
              
              const description = (row[descIdx] || '').trim();
              
              // Track latest balance from CSV
              if (balanceIdx >= 0 && row[balanceIdx]) {
                const bal = parseAmount(row[balanceIdx]);
                if (!latestDate || date >= latestDate) {
                  latestDate = date;
                  latestBalance = bal;
                }
              }
              
              transactions.push({
                id: generateId(),
                date,
                description,
                amount,
                category: null,
                account,
                reviewed: false,
                month: getMonthKey(date),
              });
            }
          } else {
            // No headers — Wells Fargo style
            // WF Checking: Date, Amount, *, CheckNum, Description
            // WF Credit: Date, Amount, *, Description
            for (const row of dataRows) {
              const date = parseDate(row[0]);
              if (!date) continue;
              
              const amount = parseAmount(row[1]);
              const description = (row[4] || row[3] || row[2] || '').trim();
              
              // WF sometimes has balance in the last populated column
              const lastCol = [...row].reverse().find(c => c && c.trim() && /^[\d$,.-]+$/.test(c.trim()));
              if (lastCol && lastCol !== String(row[1])) {
                const bal = parseAmount(lastCol);
                if (bal && (!latestDate || date >= latestDate)) {
                  latestDate = date;
                  latestBalance = bal;
                }
              }
              
              transactions.push({
                id: generateId(),
                date,
                description,
                amount,
                category: null,
                account,
                reviewed: false,
                month: getMonthKey(date),
              });
            }
          }
          
          resolve({ 
            transactions, 
            latestBalance: latestBalance !== null ? { date: latestDate, balance: latestBalance } : null 
          });
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}

// Auto-categorize based on description patterns — broad matching
const AUTO_RULES = [
  // Coffee/Drinks — coffee shops, boba, juice
  { pattern: /starbucks|dunkin|dutch\s*bros|peet|blue\s*bottle|caribou|coffee|boba|tea\s*house|jamba|juice|smoothie|philz|verve|stumptown|intelligentsia|la\s*colombe|tim\s*horton/i, category: 'Coffee/Drinks' },

  // Groceries — stores and markets
  { pattern: /trader\s*joe|safeway|qfc|kroger|grocery|whole\s*foods|costco|fred\s*meyer|walmart(?!\s*\.com)|target(?!\s*\.com)|aldi|winco|sprout|h[\s-]*e[\s-]*b|publix|wegmans|piggly|food\s*(lion|mart|city)|market|grocer|produce|meat|super\s*market|pcc\s*community|grocery\s*out|smart\s*&\s*final|save\s*mart|food\s*4\s*less|bi[\s-]*mart|harris\s*teeter|meijer/i, category: 'Groceries' },

  // Eating Out — restaurants, fast food, delivery
  { pattern: /doordash|uber\s*eat|grubhub|postmate|restaurant|cafe(?!\s*nero)|chipotle|mcdonald|wendy|taco\s*bell|subway|pizza|diner|thai|sushi|pho|teriyaki|burger|panera|chick[\s-]*fil|popeye|five\s*guys|shake\s*shack|in[\s-]*n[\s-]*out|jack\s*in|sonic|arby|noodle|wok|grill|bistro|eatery|kitchen|tavern|cantina|taqueria|poke|bagel|deli\s|waffle|ihop|denny|applebee|olive\s*garden|red\s*lobster|outback|chili|buffalo\s*wild|cheesecake\s*factory|panda\s*express|wingstop|jersey\s*mike|jimmy\s*john|firehouse\s*sub|raising\s*cane|el\s*pollo|zaxby|culver|whataburger|del\s*taco|potbelly|nando|sweetgreen|cava\s|mod\s*pizza|blaze\s*pizza|dave's\s*hot/i, category: 'Eating Out' },

  // Gas/Transport — fuel, rideshare, transit, parking, car maintenance
  { pattern: /shell|chevron|arco|76\s|exxon|mobil|bp\s|gas\s|fuel|uber(?!\s*eat)|lyft|metro|transit|parking|park\s*mobile|spot\s*hero|garage|toll|bridge|ferry|bus\s|train|amtrak|sound\s*transit|orca|car\s*wash|jiffy|valvoline|oil\s*change|tire|auto\s*zone|o'?reilly|napa\s*auto|advance\s*auto|meineke|brake|muffler|mechanic|tow|aaa\s|costco\s*gas|sam.*gas|buc[\s-]*ee|wawa\s*gas|circle\s*k|speedway|marathon\s*gas|casey|pilot\s*fly|loves\s*travel|ta\s*travel/i, category: 'Gas/Transport' },

  // Travel — airlines, hotels, vacation, car rental
  { pattern: /airline|hotel|airbnb|vrbo|expedia|travel|flight|southwest|delta|united|alaska\s*air|american\s*air|jetblue|spirit|frontier|hilton|marriott|hyatt|motel|resort|cruise|booking\.com|kayak|hopper|tsa|airport|luggage|turo|hertz|avis|enterprise|national\s*car|budget\s*car|priceline|orbitz|trivago|hostel|trip\.com|trip\s*advisor|amtrak|greyhound|flixbus/i, category: 'Travel' },

  // Doctors/Health — medical, dental, pharmacy, vision, mental health
  { pattern: /cvs|walgreens|pharmacy|rite\s*aid|doctor|medical|clinic|hospital|dental|dentist|health(?!.*club)|copay|urgent\s*care|kaiser|swedish|providence|virginia\s*mason|lab\s*corp|quest\s*diag|optical|vision|eye|lenscrafters|therapy|therapist|counselor|mental|psych|chiro|physical\s*therapy|derma|ortho|obgyn|planned\s*parent|rx\s|prescription|medic|zocdoc|one\s*medical|minute\s*clinic|good\s*rx/i, category: 'Doctors/Health' },

  // Fitness/Wellness — gyms, yoga, sports, wellness
  { pattern: /planet\s*fitness|gym\s|anytime\s*fitness|crunch|equinox|classpass|peloton|yoga|pilates|crossfit|orangetheory|barry's|soul\s*cycle|barre|martial\s*art|dojo|boxing|climbing|bouldering|rec\s*center|ymca|ywca|massage|spa\s|sauna|float|acupuncture|wellness|health\s*club|lifetime\s*fit|la\s*fitness|gold'?s\s*gym|24\s*hour/i, category: 'Fitness/Wellness' },

  // Clothing/Beauty — apparel, shoes, cosmetics, hair
  { pattern: /nordstrom|macy|zara|h&m|uniqlo|gap\s|old\s*navy|banana\s*republic|j\.?\s*crew|lululemon|nike\s|adidas|puma|reebok|under\s*armour|ross\s|tjmaxx|t\.?j\.?\s*maxx|marshalls|burlington|sephora|ulta|glossier|bath\s*&\s*body|salon|barber|hair\s*cut|nails|nail\s*salon|waxing|beauty|cosmetic|warby|foot\s*locker|dsw|shoe|rei\s|patagonia|columbia|thrift|goodwill|asos|shein|fashion\s*nova|primark|express\s(?!vpn)|anthropologie|free\s*people|urban\s*outfit/i, category: 'Clothing/Beauty' },

  // Education/Books — tuition, courses, books, learning
  { pattern: /tuition|university|college|school\s|course|udemy|coursera|skillshare|masterclass|book|barnes|powell|kindle\s*(?!unlimited)|textbook|library|chegg|quizlet|duolingo|brilliant|khan\s*academy|student|education|learning|seminar|workshop|conference|cert(?:ification|ified)/i, category: 'Education/Books' },

  // Gifts/Donations — charity, gifts, flowers
  { pattern: /gift|donat|charity|church|tithe|gofundme|red\s*cross|salvation\s*army|united\s*way|flowers|floral|florist|bouquet|hallmark|card\s*shop|1-?800-?flower|etsy(?!.*home)|present|wedding\s*reg/i, category: 'Gifts/Donations' },

  // Home/Cat/Shipping — amazon, home improvement, pet, packages
  { pattern: /amazon(?!.*card)|amzn|home\s*depot|lowe|lowes|ikea|pet|chewy|cat\s|dog\s|vet(?!eran)|petsmart|petco|shipping|usps|ups\s|fedex|post\s*office|hardware|ace\s*hardware|bed\s*bath|wayfair|pottery\s*barn|crate|west\s*elm|world\s*market|michaels|hobby\s*lobby|joann|plant|nursery|garden|menards|tractor\s*supply|harbor\s*freight|true\s*value|container\s*store|restoration\s*hardware/i, category: 'Home/Cat/Shipping' },

  // Alcohol/Snacks/Entertainment — bars, liquor, movies, gaming, events
  { pattern: /bar\s|liquor|wine(?!\s*country)|beer|brew(?!ster)|total\s*wine|bev\s*mo|spirit|cork|bottle\s*shop|cinema|movie|theater|theatre|amc\s|regal|gaming|steam\s|playstation|xbox|nintendo|twitch|concert|ticket|live\s*nation|stubhub|event|museum|zoo|aquarium|bowl(?!ing\s*green)|arcade|dave.*buster|top\s*golf|mini\s*golf|escape\s*room|karaoke|comedy|snack|candy|7[\s-]*eleven|convenience|gas\s*station\s*food|gopuff|drizly|minibar/i, category: 'Alcohol/Snacks/Entertainment' },

  // Rent
  { pattern: /rent\s|property|landlord|lease|apartment|housing|zelle.*rent|venmo.*rent|avail.*rent/i, category: 'Rent' },

  // Utilities — power, water, sewer, trash
  { pattern: /pse|puget|seattle\s*(city\s*light|public\s*util)|spu|scl|electric|water|sewer|utility|waste|garbage|recology|pg&?e|power|energy|gas\s*bill|duke\s*energy|con\s*edison|national\s*grid|dominion/i, category: 'Utilities' },

  // Internet — ISPs, broadband
  { pattern: /xfinity|comcast|centurylink|lumen|wave\s*broadband|spectrum|att\s*internet|frontier\s*comm|verizon\s*fios|cox\s|mediacom|optimum|altice|starlink|google\s*fiber|astound|rcn\s|windstream/i, category: 'Internet' },

  // Storage
  { pattern: /public\s*storage|extra\s*space|storage|cube\s*smart|life\s*storage|u[\s-]*haul|pods\s/i, category: 'Storage' },

  // Insurance
  { pattern: /state\s*farm|geico|allstate|progressive|insurance|insur|liberty\s*mutual|farmers|usaa|nationwide|travelers|amica|erie|metlife|prudential|aflac|cigna|aetna|anthem|blue\s*cross|united\s*health|humana|root\s*ins|lemonade\s*ins/i, category: 'Insurance' },

  // Phone
  { pattern: /t[\s-]*mobile|verizon(?!\s*fios)|at&t(?!\s*internet)|att\s(?!internet)|cricket|phone\s*bill|wireless|mint\s*mobile|visible|google\s*fi|xfinity\s*mobile|boost\s*mobile|metro\s*by|us\s*cellular|straight\s*talk/i, category: 'Phone' },

  // Subscriptions — streaming, software, memberships
  { pattern: /spotify|netflix|hulu|disney|hbo|apple\s*(music|tv\+|one|arcade)|paramount|peacock|youtube\s*prem|adobe|figma|canva|dropbox|icloud|google\s*(one|storage)|microsoft\s*365|openai|chatgpt|audible|kindle\s*unlimited|flo\s*app|jetbrains|webflow|github|notion|1password|vpn|nord|express\s*vpn|amazon\s*prime|costco\s*member|sam'?s\s*club\s*member|stitch\s*fix|ipsy|birchbox|dollar\s*shave|hello\s*fresh|blue\s*apron|crunchyroll|funimation|dazn|espn\+|sirius|pandora|tidal|calm\s*app|headspace|nytimes|wash.*post|wsj|substack/i, category: 'Subscriptions' },

  // Refund — returns, refunds, credits
  { pattern: /refund|return|credit\s*adj|chargeback|reversal|rebate|reimburse/i, category: 'Refund' },

  // Transfer/Payment — credit card payments, transfers, P2P
  { pattern: /transfer|payment|pay\s*credit|card\s*payment|autopay|pay\s*bill|payoff|balance\s*pay|credit\s*card|wells\s*fargo.*pay|discover.*pay|sofi.*transfer|zelle(?!.*rent)|venmo(?!.*rent)|cash\s*app(?!.*buy)/i, category: 'Transfer/Payment' },

  // Income — paychecks, deposits, interest
  { pattern: /payroll|direct\s*dep|deposit|salary|wage|income|employer|paycheck|ach\s*credit|tax\s*refund|irs|interest\s*paid|dividend|bonus|commission|freelance|1099|w-?2|stipend/i, category: 'Income' },
];

export function suggestCategory(description) {
  if (!description) return null;
  for (const rule of AUTO_RULES) {
    if (rule.pattern.test(description)) {
      return rule.category;
    }
  }
  return null;
}
