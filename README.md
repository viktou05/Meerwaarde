# Meerwaarde

Persoonlijke tracker voor de Belgische meerwaardebelasting op financiële activa (vanaf 1/1/2026).
Samenvoeging en herwerking van *Meerwaarde1* en *Meerwaarde2*.

## Wat zit erin

- **Posities 31/12/2025**: per rekening aantal + slotkoers (optioneel hogere historische aankoopprijs).
- **Aan- & verkopen**: snel toevoegen met live berekening van de meerwaarde, of importeren:
  DEGIRO `Transactions.csv`, Interactive Brokers/MEXEM *Activity Statement* (CSV), Bitvavo/Coinbase
  of elke tabel die je uit Excel plakt. Vreemde munt wordt omgerekend aan de ECB-koers van die dag.
- **Koersen**: één tabel om af en toe de huidige koers in te vullen.
- **Planner**: vrijstelling opgebruiken (verkopen + terugkopen) met TOB/kosten, verliezen benutten,
  2030-regel, verkoop simuleren, grote winst spreiden over jaren.
- **Aangifte**: jaaroverzicht met FIFO-detail per verkoop, CSV-export.
- Gegevens blijven in de browser (localStorage); back-up als JSON.

## Rekenregels (`src/engine/tax.ts`)

- 10% op gerealiseerde meerwaarden; aanschaffingswaarde voor oude posities = waarde 31/12/2025.
- Tot 31/12/2030 mag een hogere historische aankoopprijs gebruikt worden, enkel om de winst te verkleinen (nooit een verlies).
- Kosten en TOB niet aftrekbaar. FIFO (instelbaar: over alle rekeningen of per rekening).
- Minderwaarden enkel in hetzelfde jaar. Vrijstelling 10.000 (per jaar aanpasbaar voor indexatie),
  onbenut deel tot 1.000/jaar overdraagbaar, 5 jaar geldig.
- Ingehouden voorheffing (Belgische banken) wordt vergeleken met de werkelijk verschuldigde belasting.

Geen fiscaal advies — controleer met een fiscalist.

## Lokaal draaien

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rekenregels testen
```

## Online zetten (GitHub + Vercel)

1. Maak op GitHub een nieuwe (private) repository, bv. `meerwaarde`.
2. Upload de inhoud van deze map (zonder `node_modules`): *Add file → Upload files* en sleep alles erin, of:
   ```bash
   git init && git add . && git commit -m "Meerwaarde app"
   git branch -M main
   git remote add origin https://github.com/<jouw-naam>/meerwaarde.git
   git push -u origin main
   ```
3. Op vercel.com: *Add New → Project → Import* je repository. Vercel herkent Vite vanzelf
   (Build: `npm run build`, Output: `dist`). Klik *Deploy*.
4. Elke push naar `main` zet automatisch een nieuwe versie online.

Let op: je gegevens staan in de browser waarin je ze ingeeft. Gebruik *Back-up downloaden* om ze mee te nemen naar een andere computer.
