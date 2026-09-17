import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, company_id } = await req.json();
    if (!file_url || !company_id) return Response.json({ error: 'file_url e company_id richiesti' }, { status: 400 });

    // Step 1: Extract products with AI
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'number' },
                unit: { type: 'string', enum: ['kg', 'lt', 'pz', 'confezione'] },
                category: { type: 'string', enum: ['frutta', 'verdura', 'formaggi', 'salumi', 'olio', 'vino', 'miele', 'pane_pasta', 'conserve', 'altro'] },
                image_url: { type: 'string', description: 'If the source file contains a photo/image of this product, provide its URL or base64. Otherwise leave empty.' },
              },
              required: ['name', 'price']
            }
          }
        }
      }
    });

    if (result.status !== 'success' || !result.output?.products?.length) {
      return Response.json({ error: 'Nessun prodotto trovato nel file' }, { status: 422 });
    }

    const products = result.output.products;

    // Step 2: For products without an image, generate one with AI
    const enriched = await Promise.all(products.map(async (prod) => {
      if (prod.image_url && prod.image_url.startsWith('http')) {
        return prod; // keep existing URL from file
      }
      // Generate a photorealistic product image
      try {
        const generated = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `Professional food photography of "${prod.name}", Italian artisan product, ${prod.category}, on a rustic wooden table with natural light, clean background, high quality, appetizing`,
        });
        return { ...prod, image_url: generated.url };
      } catch (_) {
        return prod; // if generation fails, just skip
      }
    }));

    // Step 3: Save all products
    const created = [];
    for (const prod of enriched) {
      const saved = await base44.asServiceRole.entities.Product.create({
        name: prod.name,
        description: prod.description || '',
        price: prod.price || 0,
        unit: prod.unit || 'pz',
        category: prod.category || 'altro',
        image_url: prod.image_url || '',
        company_id,
        available: true,
      });
      created.push(saved);
    }

    return Response.json({ count: created.length, products: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});