import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Dati stagionali — specchietto degli ingredienti principali con alias per matching LLM
const SEASONAL_DATA = [
  { name: 'peperoni', months: [6, 7, 8, 9] },
  { name: 'pomodori', months: [5, 6, 7, 8, 9] },
  { name: 'pomodorini', months: [5, 6, 7, 8, 9] },
  { name: 'melanzane', months: [6, 7, 8, 9] },
  { name: 'zucchine', months: [4, 5, 6, 7, 8, 9] },
  { name: 'cetrioli', months: [5, 6, 7, 8] },
  { name: 'fagiolini', months: [5, 6, 7, 8] },
  { name: 'fragole', months: [3, 4, 5] },
  { name: 'ciliegie', months: [4, 5, 6] },
  { name: 'albicocche', months: [5, 6] },
  { name: 'pesche', months: [6, 7, 8] },
  { name: 'nettarine', months: [6, 7, 8] },
  { name: 'melone', months: [6, 7, 8] },
  { name: 'anguria', months: [6, 7, 8] },
  { name: 'cocomero', months: [6, 7, 8] },
  { name: 'fichi', months: [7, 8, 9] },
  { name: 'uva', months: [8, 9, 10] },
  { name: 'melograno', months: [9, 10, 11] },
  { name: 'castagne', months: [9, 10] },
  { name: 'prugne', months: [7, 8, 9] },
  { name: 'susine', months: [6, 7, 8] },
  { name: 'arance', months: [0, 1, 2, 11] },
  { name: 'mandarini', months: [0, 1, 11] },
  { name: 'clementine', months: [0, 1, 10, 11] },
  { name: 'limoni', months: [0, 1, 2, 3, 11] },
  { name: 'kiwi', months: [0, 1, 2, 3, 11] },
  { name: 'bergamotto', months: [0, 1, 2, 11] },
  { name: 'pere', months: [0, 1, 7, 8, 9, 10, 11] },
  { name: 'mele', months: [0, 1, 2, 8, 9, 10, 11] },
  { name: 'noci', months: [9, 10, 11] },
  { name: 'nocciole', months: [8, 9, 10] },
  { name: 'mandorle', months: [7, 8, 9] },
  { name: 'spinaci', months: [0, 1, 2, 3, 9, 10, 11] },
  { name: 'cavolo nero', months: [0, 1, 2, 10, 11] },
  { name: 'verza', months: [0, 1, 2, 10, 11] },
  { name: 'finocchi', months: [0, 1, 2, 11] },
  { name: 'porri', months: [0, 1, 2, 9, 10, 11] },
  { name: 'carciofi', months: [1, 2, 3, 4, 9, 10, 11] },
  { name: 'asparagi', months: [2, 3, 4, 5] },
  { name: 'piselli', months: [3, 4, 5] },
  { name: 'fave', months: [3, 4, 5] },
  { name: 'ravanelli', months: [3, 4, 5, 9, 10] },
  { name: 'lattuga', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'rucola', months: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'zucca', months: [9, 10, 11] },
  { name: 'broccoli', months: [9, 10, 11, 0, 1, 2] },
  { name: 'cavolfiore', months: [9, 10, 11, 0, 1, 2] },
  { name: 'radicchio', months: [9, 10, 11, 0, 1, 2] },
  { name: 'barbabietole', months: [8, 9, 10, 11] },
  { name: 'cipolle', months: [5, 6, 7, 8, 9, 10] },
  { name: 'aglio', months: [4, 5, 6, 7] },
  { name: 'cime di rapa', months: [0, 1, 2, 3, 10, 11] },
  { name: 'cicoria', months: [0, 1, 2, 3, 10, 11] },
  { name: 'puntarelle', months: [0, 1, 2, 10, 11] },
  { name: 'topinambur', months: [10, 11, 0, 1, 2] },
  { name: 'funghi porcini', months: [8, 9, 10] },
  { name: 'funghi', months: [8, 9, 10] },
  { name: 'basilico', months: [4, 5, 6, 7, 8, 9] },
  { name: 'origano', months: [5, 6, 7, 8] },
  { name: 'peperoncino', months: [7, 8, 9] },
  { name: 'fagioli borlotti', months: [7, 8, 9] },
  { name: 'fagioli', months: [7, 8, 9] },
];

const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Triggered by entity automation: body contains event + data
    const product = body.data || body;
    const productId = body.event?.entity_id || product.id;

    if (!product || !product.name) {
      return Response.json({ skipped: true, reason: 'No product name' });
    }

    // Only check products that are currently available
    if (!product.available) {
      return Response.json({ skipped: true, reason: 'Product not available' });
    }

    const currentMonth = new Date().getMonth(); // 0-indexed
    const productName = product.name;
    const productDescription = product.description || '';

    // Step 1: Use LLM to extract seasonal ingredients from the product name/description
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sei un esperto di cucina italiana e stagionalità dei prodotti.
Analizza il nome e la descrizione di questo prodotto alimentare e identifica TUTTI gli ingredienti o componenti che potrebbero essere prodotti stagionali (frutta, verdura, erbe aromatiche) italiani.

Prodotto: "${productName}"
Descrizione: "${productDescription}"

Rispondi con una lista JSON di ingredienti stagionali riconosciuti (in italiano, al singolare o plurale come preferisci, in minuscolo).
Considera anche ingredienti impliciti: ad esempio "pizza margherita" contiene pomodori e basilico, "pesto" contiene basilico, "caponata" contiene melanzane e pomodori, ecc.
Se non ci sono ingredienti stagionali identificabili, restituisci una lista vuota.`,
      response_json_schema: {
        type: 'object',
        properties: {
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista degli ingredienti stagionali rilevati nel prodotto'
          }
        }
      }
    });

    const detectedIngredients = llmResult?.ingredients || [];

    if (detectedIngredients.length === 0) {
      return Response.json({ skipped: true, reason: 'No seasonal ingredients detected' });
    }

    // Step 2: Check which detected ingredients are out of season this month
    const outOfSeasonIngredients = [];

    for (const ingredient of detectedIngredients) {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      // Find matching seasonal product
      const match = SEASONAL_DATA.find(sp => {
        const spName = sp.name.toLowerCase();
        return normalizedIngredient.includes(spName) || spName.includes(normalizedIngredient);
      });

      if (match && !match.months.includes(currentMonth)) {
        outOfSeasonIngredients.push({
          name: ingredient,
          seasonalMonths: match.months.map(m => MONTH_NAMES[m]).join(', ')
        });
      }
    }

    if (outOfSeasonIngredients.length === 0) {
      return Response.json({ skipped: true, reason: 'All detected ingredients are in season' });
    }

    // Step 3: Get the company info — skip if not a real registered producer
    let companyName = 'Produttore sconosciuto';
    if (product.company_id) {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: product.company_id }, '-updated_date', 1);
      if (companies.length === 0) {
        return Response.json({ skipped: true, reason: 'Company not found' });
      }
      const company = companies[0];
      if (!company.is_registered) {
        return Response.json({ skipped: true, reason: 'Company is not a registered producer' });
      }
      companyName = company.name;
    } else {
      return Response.json({ skipped: true, reason: 'No company_id on product' });
    }

    // Step 4: Get all staff members to notify
    const staffMembers = await base44.asServiceRole.entities.StaffMember.filter({ is_active: true }, '-updated_date', 100);

    if (staffMembers.length === 0) {
      return Response.json({ notified: false, reason: 'No active staff members found' });
    }

    // Step 5: Build notification message
    const ingredientsList = outOfSeasonIngredients
      .map(i => `${i.name} (stagione: ${i.seasonalMonths})`)
      .join(', ');

    const title = `⚠️ Prodotto fuori stagione: ${productName}`;
    const message = `Il produttore "${companyName}" ha reso disponibile "${productName}" che contiene ingredienti fuori stagione a ${MONTH_NAMES[currentMonth]}: ${ingredientsList}.`;

    // Step 6: Create a Notification for each staff member
    const notifications = staffMembers.map(staff => ({
      user_email: staff.email,
      title,
      message,
      type: 'generic',
      company_id: product.company_id || null,
      product_id: productId || null,
      read: false,
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({
      notified: true,
      staffCount: staffMembers.length,
      outOfSeasonIngredients,
      productName,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});