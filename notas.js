const { Client } = require('pg');

const getClient = () => new Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  const client = getClient();
  await client.connect();

  // CORS (para dev local e produção)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    await client.end();
    return { statusCode: 200, headers: corsHeaders };
  }

  try {
    // GET
    if (event.httpMethod === 'GET') {
      const { mes, categoria } = event.queryStringParameters || {};
      let query = 'SELECT * FROM notas';
      const params = [];
      let where = [];
      if (mes) {
        where.push(`to_char(data, 'YYYY-MM') = $${params.length+1}`);
        params.push(mes);
      }
      if (categoria && categoria !== 'Todas') {
        where.push(`categoria = $${params.length+1}`);
        params.push(categoria);
      }
      if (where.length) query += ' WHERE ' + where.join(' AND ');
      query += ' ORDER BY data DESC, id DESC';
      const { rows } = await client.query(query, params);
      await client.end();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(rows)
      };
    }
    // POST
    if (event.httpMethod === 'POST') {
      const nota = JSON.parse(event.body);
      const { categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo } = nota;
      const result = await client.query(
        `INSERT INTO notas (categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo]
      );
      await client.end();
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify(result.rows[0])
      };
    }
    // PUT
    if (event.httpMethod === 'PUT') {
      const id = event.queryStringParameters.id;
      const nota = JSON.parse(event.body);
      const { categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo } = nota;
      const result = await client.query(
        `UPDATE notas SET categoria=$1, descricao=$2, data=$3, valor=$4, arquivo_url=$5, arquivo_nome=$6, arquivo_tipo=$7 WHERE id=$8 RETURNING *`,
        [categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo, id]
      );
      await client.end();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result.rows[0])
      };
    }
    // DELETE
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters.id;
      await client.query('DELETE FROM notas WHERE id=$1', [id]);
      await client.end();
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: ''
      };
    }
    await client.end();
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  } catch (err) {
    await client.end();
    return { statusCode: 500, headers: corsHeaders, body: err.message };
  }
};