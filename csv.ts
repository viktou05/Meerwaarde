// Kleine, afhankelijkheidsvrije CSV/TSV-parser + slimme kolomherkenning.

export function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts: [string, number][] = ['\t', ';', ','].map((d) => [d, firstLines.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

export function parseDelimited(text: string, delimiter?: string): string[][] {
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === d) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

/** Getal uit Belgische/Europese of Amerikaanse notatie: "1.234,56", "1,234.56", "-12,5", "€ 3 000". */
export function parseNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  let s = String(raw).trim().replace(/[€$\s ]/g, '').replace(/^(EUR|USD)/i, '');
  if (s === '' || s === '-') return undefined;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // "1,234" kan duizendtal zijn; in BE is komma bijna altijd decimaal. Duizendtal enkel bij meerdere komma's.
    if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, ''); // 1.234.567
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return neg ? -n : n;
}

/** Datum naar YYYY-MM-DD. Ondersteunt 2026-03-01, 01-03-2026, 01/03/2026, 1.3.2026, "2026-03-01, 09:30:00". */
export function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // dag-maand-jaar (Europees)
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

export type Field =
  | 'date'
  | 'type'
  | 'name'
  | 'isin'
  | 'ticker'
  | 'quantity'
  | 'price'
  | 'amountEUR'
  | 'amountLocal'
  | 'currency'
  | 'fx'
  | 'costs'
  | 'withheld'
  | 'account';

export const FIELD_LABELS: Record<Field, string> = {
  date: 'Datum',
  type: 'Type (koop/verkoop)',
  name: 'Naam effect',
  isin: 'ISIN',
  ticker: 'Ticker / symbool',
  quantity: 'Aantal',
  price: 'Koers per stuk',
  amountEUR: 'Bedrag in EUR',
  amountLocal: 'Bedrag in vreemde munt',
  currency: 'Munt',
  fx: 'Wisselkoers',
  costs: 'Kosten / TOB',
  withheld: 'Ingehouden meerwaardebelasting',
  account: 'Rekening',
};

// Synoniemen (kleine letters, exacte match eerst, dan 'begint met').
const SYNONYMS: Record<Field, string[]> = {
  date: ['datum', 'date', 'trade date', 'transactiedatum', 'uitvoeringsdatum', 'date/time', 'timestamp', 'activity date', 'tijdstip'],
  type: ['type', 'transactietype', 'soort', 'buy/sell', 'side', 'richting', 'omschrijving', 'description', 'transaction type', 'trans code'],
  name: ['product', 'naam', 'name', 'effect', 'instrument', 'asset name', 'security', 'omschrijving effect', 'fonds'],
  isin: ['isin', 'isin code', 'isin-code', 'security id'],
  ticker: ['symbol', 'symbool', 'ticker', 'asset', 'currency', 'munt (crypto)'],
  quantity: ['aantal', 'quantity', 'qty', 'stuks', 'amount', 'hoeveelheid', 'quantity transacted', 'shares'],
  price: ['koers', 'price', 't. price', 'prijs', 'unit price', 'spot price at transaction', 'quote price', 'koers per stuk'],
  amountEUR: ['waarde', 'bedrag eur', 'bedrag (eur)', 'waarde eur', 'value eur', 'totaal eur', 'subtotal', 'received / paid amount', 'bedrag', 'amount eur', 'brutobedrag'],
  amountLocal: ['lokale waarde', 'proceeds', 'local value', 'bedrag lokaal'],
  currency: ['valuta', 'munt', 'currency code', 'quote currency', 'spot price currency'],
  fx: ['wisselkoers', 'exchange rate', 'fx', 'fx rate'],
  costs: ['transactiekosten', 'transactiekosten en/of', 'kosten', 'fees', 'fee', 'comm/fee', 'commission', 'fee amount', 'beurstaks', 'tob'],
  withheld: ['meerwaardebelasting', 'ingehouden belasting', 'voorheffing', 'roerende voorheffing', 'withholding'],
  account: ['rekening', 'account', 'portefeuille', 'broker'],
};

export function guessMapping(headers: string[]): Partial<Record<Field, number>> {
  const h = headers.map((x) => x.toLowerCase().trim());
  const used = new Set<number>();
  const map: Partial<Record<Field, number>> = {};
  const fields = Object.keys(SYNONYMS) as Field[];
  // Pass 1: exacte matches, in volgorde van synoniemprioriteit
  for (const f of fields) {
    for (const syn of SYNONYMS[f]) {
      const i = h.findIndex((x, idx) => x === syn && !used.has(idx));
      if (i > -1) {
        map[f] = i;
        used.add(i);
        break;
      }
    }
  }
  // Pass 2: 'begint met'
  for (const f of fields) {
    if (map[f] !== undefined) continue;
    for (const syn of SYNONYMS[f]) {
      const i = h.findIndex((x, idx) => x.startsWith(syn) && !used.has(idx));
      if (i > -1) {
        map[f] = i;
        used.add(i);
        break;
      }
    }
  }
  return map;
}

export type RowType = 'koop' | 'verkoop' | 'transfer' | 'negeer';

export function guessType(raw: string | undefined, quantity: number | undefined, amount: number | undefined): RowType {
  const s = (raw || '').toLowerCase();
  if (/(verkoop|sell|sold|\bs\b|vente)/.test(s)) return 'verkoop';
  if (/(aankoop|koop|buy|bought|\bb\b|achat|inschrijving)/.test(s)) return 'koop';
  if (/(transfer|overdracht|overboeking effecten)/.test(s)) return 'transfer';
  if (/(dividend|rente|interest|storting|deposit|withdraw|opname|fee|kosten|staking|reward)/.test(s)) return 'negeer';
  if (quantity !== undefined && quantity < 0) return 'verkoop';
  if (quantity !== undefined && quantity > 0) return 'koop';
  // Geen aantal-teken: kijk naar bedrag (DEGIRO-stijl: aankoop = negatief bedrag)
  if (amount !== undefined && amount < 0) return 'koop';
  return 'negeer';
}
