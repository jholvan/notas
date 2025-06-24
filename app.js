// Categorias disponíveis
const categorias = [
  'Despesas Médicas', 'Alimentação', 'Moradia', 'Contas de Consumo', 'Transporte', 'Lazer e Entretenimento', 'Outras Despesas'
];

const API = '/.netlify/functions/notas';

let todasNotas = [];
let categoriaSelecionada = categorias[0];
let mesSelecionado = null;

// =====================
// Funções para Neon API
// =====================
async function getNotas({ mes, categoria } = {}) {
  let url = API;
  let params = [];
  if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
  if (categoria) params.push(`categoria=${encodeURIComponent(categoria)}`);
  if (params.length) url += '?' + params.join('&');
  const resp = await fetch(url);
  return await resp.json();
}
async function addNota(nota) {
  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nota)
  });
  return await resp.json();
}
async function updateNota(id, nota) {
  const resp = await fetch(`${API}?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nota)
  });
  return await resp.json();
}
async function deleteNota(id) {
  await fetch(`${API}?id=${id}`, { method: 'DELETE' });
}

// =====================
// Upload para Cloudinary
// =====================
// Troque CLOUD_NAME e UPLOAD_PRESET pelos seus dados Cloudinary!
async function uploadArquivo(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', 'notasvo'); // TROQUE AQUI
  const resp = await fetch('https://api.cloudinary.com/v1_1/djmrww1j7/auto/upload/notasvo', { // TROQUE AQUI
    method: 'POST',
    body: form
  });
  if (!resp.ok) throw new Error('Falha no upload');
  const data = await resp.json();
  return {
    url: data.secure_url,
    nome: file.name,
    tipo: file.type
  };
}

// =====================
// Utilitários
// =====================
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [y, m, d] = dataStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatarValor(valor) {
  if (!valor && valor !== 0) return '';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function getAnoMes(data) {
  return data ? data.slice(0,7) : '';
}
function mesNome(anoMes) {
  if (!anoMes) return '';
  const [ano, mes] = anoMes.split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[parseInt(mes,10)-1]}/${ano}`;
}

// =====================
// Renderização
// =====================
function preencherMeses() {
  const select = document.getElementById('mesSelect');
  const meses = Array.from(new Set(
    todasNotas
      .filter(n => categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada)
      .map(n => getAnoMes(n.data))
  )).sort((a,b)=>b.localeCompare(a));
  select.innerHTML = '';
  if (meses.length === 0) {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0,7);
    select.innerHTML = `<option value="${mesAtual}">${mesNome(mesAtual)}</option>`;
    mesSelecionado = mesAtual;
    return;
  }
  meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = mesNome(m);
    select.appendChild(opt);
  });
  if (!mesSelecionado || !meses.includes(mesSelecionado)) mesSelecionado = meses[0];
  select.value = mesSelecionado;
}
function mostrarTotalMes() {
  const totalSpan = document.getElementById('valorTotalMes');
  const total = todasNotas.filter(n =>
    (categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada) && getAnoMes(n.data) === mesSelecionado
  ).reduce((soma, n) => soma + Number(n.valor), 0);
  totalSpan.textContent = `Total do mês: ${formatarValor(total)}`;
}
function renderizarNotas() {
  preencherMeses();
  mostrarTotalMes();
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = '';
  const busca = document.getElementById('searchInput').value.toLowerCase();
  const notasFiltradas = todasNotas
    .filter(nota =>
      (categoriaSelecionada === "Todas" ? true : nota.categoria === categoriaSelecionada) &&
      getAnoMes(nota.data) === mesSelecionado &&
      (
        nota.descricao.toLowerCase().includes(busca) ||
        formatarData(nota.data).includes(busca) ||
        formatarValor(nota.valor).includes(busca)
      )
    ).sort((a, b) => b.id - a.id);

  if (notasFiltradas.length === 0) {
    notesList.innerHTML = `<div style="color:var(--muted);padding:32px;font-size:1.1rem;">Nenhuma nota encontrada para esta categoria e mês.</div>`;
    return;
  }

  notasFiltradas.forEach(nota => {
    let linkArquivo = '';
    if (nota.arquivo_url) {
      let iconeArquivo = '📎';
      if (nota.arquivo_tipo === 'application/pdf') iconeArquivo = '📄';
      else if (nota.arquivo_tipo && nota.arquivo_tipo.startsWith('image/')) iconeArquivo = '🖼️';
      linkArquivo = `<a href="${nota.arquivo_url}" class="note-link" target="_blank" rel="noopener"><span>${iconeArquivo}</span><span>${nota.arquivo_nome}</span></a>`;
    } else {
      linkArquivo = `<span class="note-link" style="color:var(--muted);font-style:italic;"><span>📎</span><span>Nenhum arquivo</span></span>`;
    }
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-title">${nota.descricao}</div>
      <div class="note-info">
        <span><strong>Categoria:</strong> ${nota.categoria}</span>
        <span><strong>Data:</strong> ${formatarData(nota.data)}</span>
        <span><strong>Valor:</strong> ${formatarValor(nota.valor)}</span>
      </div>
      ${linkArquivo}
      <div class="note-actions">
        <button onclick="visualizarNota(${nota.id})">Visualizar</button>
        <button onclick="editarNota(${nota.id})">Editar</button>
        <button onclick="excluirNota(${nota.id})">Excluir</button>
      </div>
    `;
    notesList.appendChild(card);
  });
}

// =====================
// CRUD e Modal
// =====================
function visualizarNota(id) {
  const nota = todasNotas.find(n => n.id === id);
  alert(
    `Descrição: ${nota.descricao}\nCategoria: ${nota.categoria}\nData: ${formatarData(nota.data)}\nValor: ${formatarValor(nota.valor)}`
  );
}
window.visualizarNota = visualizarNota;
window.editarNota = editarNota;
window.excluirNota = excluirNota;

function excluirNota(id) {
  if (confirm('Deseja realmente excluir esta nota fiscal?')) {
    deleteNota(id).then(() => {
      todasNotas = todasNotas.filter(n => n.id !== id);
      renderizarNotas();
    });
  }
}

const modalOverlay = document.getElementById('modalOverlay');
const addNoteBtn = document.getElementById('addNoteBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const noteForm = document.getElementById('noteForm');
const arquivoAtualDiv = document.getElementById('arquivoAtual');
const modalTitulo = document.getElementById('modalTitulo');
const editIdInput = document.getElementById('editId');

function abrirModal(nota = null) {
  noteForm.reset();
  arquivoAtualDiv.innerHTML = '';
  editIdInput.value = '';
  modalTitulo.textContent = nota ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal';
  if (nota) {
    document.getElementById('categoria').value = nota.categoria;
    document.getElementById('descricao').value = nota.descricao;
    document.getElementById('data').value = nota.data;
    document.getElementById('valor').value = nota.valor;
    editIdInput.value = nota.id;
    if (nota.arquivo_url) {
      let icone = '📎';
      if (nota.arquivo_tipo === 'application/pdf') icone = '📄';
      else if (nota.arquivo_tipo && nota.arquivo_tipo.startsWith('image/')) icone = '🖼️';
      arquivoAtualDiv.innerHTML = `<small>Arquivo atual: <a href="${nota.arquivo_url}" target="_blank">${icone} ${nota.arquivo_nome}</a></small>`;
    }
  } else {
    document.getElementById('categoria').value = categoriaSelecionada !== "Todas" ? categoriaSelecionada : '';
  }
  modalOverlay.classList.remove('hidden');
  setTimeout(() => { document.getElementById('descricao').focus(); }, 120);
}
function fecharModal() { modalOverlay.classList.add('hidden'); }

addNoteBtn.addEventListener('click', ()=>abrirModal());
closeModalBtn.addEventListener('click', fecharModal);
cancelBtn.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) fecharModal(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) fecharModal(); });

noteForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const categoria = document.getElementById('categoria').value;
  const descricao = document.getElementById('descricao').value.trim();
  const data = document.getElementById('data').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const arquivoInput = document.getElementById('arquivo');
  const editId = editIdInput.value ? Number(editIdInput.value) : null;
  let arquivo_url = null, arquivo_nome = null, arquivo_tipo = null;
  if (arquivoInput.files.length > 0) {
    try {
      const upload = await uploadArquivo(arquivoInput.files[0]);
      arquivo_url = upload.url;
      arquivo_nome = upload.nome;
      arquivo_tipo = upload.tipo;
    } catch (err) {
      alert('Falha ao enviar arquivo: ' + err.message);
      return;
    }
  }
  let nota = { categoria, descricao, data, valor, arquivo_url, arquivo_nome, arquivo_tipo };

  if (editId) {
    // Se não atualizou arquivo, manter o anterior
    if (!arquivo_url) {
      const antiga = todasNotas.find(n=>n.id===editId);
      nota.arquivo_url = antiga.arquivo_url;
      nota.arquivo_nome = antiga.arquivo_nome;
      nota.arquivo_tipo = antiga.arquivo_tipo;
    }
    await updateNota(editId, nota);
    todasNotas = await getNotas();
  } else {
    await addNota(nota);
    todasNotas = await getNotas();
  }
  fecharModal();
  categoriaSelecionada = categoria;
  renderizarNotas();
});

function editarNota(id) {
  const nota = todasNotas.find(n => n.id === id);
  if (!nota) return;
  abrirModal(nota);
}

document.getElementById('searchInput').addEventListener('input', renderizarNotas);

document.querySelectorAll('aside nav a').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('aside nav a').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    categoriaSelecionada = this.dataset.category;
    renderizarNotas();
  });
});

document.getElementById('mesSelect').addEventListener('change', function() {
  mesSelecionado = this.value;
  renderizarNotas();
});

async function inicializar() {
  todasNotas = await getNotas();
  renderizarNotas();
}
inicializar();

// ==== Botão baixar resumo em PDF ====
document.getElementById('baixarResumoBtn').addEventListener('click', function() {
  const notasMes = todasNotas.filter(n =>
    (categoriaSelecionada === "Todas" ? true : n.categoria === categoriaSelecionada) && getAnoMes(n.data) === mesSelecionado
  );
  if (notasMes.length === 0) {
    alert('Não há lançamentos para exportar neste mês/categoria.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const tituloCategoria = categoriaSelecionada === "Todas" ? "Todas as Despesas" : categoriaSelecionada;
  doc.setFontSize(16);
  doc.text(`Resumo de Gastos - ${tituloCategoria}`, 10, 15);
  doc.setFontSize(11);
  doc.text(`Mês: ${mesNome(mesSelecionado)}`, 10, 23);

  const startY = 32;
  let y = startY;

  doc.setFont('helvetica','bold');
  doc.text('Categoria', 10, y);
  doc.text('Descrição', 48, y);
  doc.text('Data', 120, y);
  doc.text('Valor', 150, y);
  doc.setFont('helvetica','normal');
  y += 6;

  notasMes.forEach(nota => {
    doc.text(nota.categoria, 10, y, { maxWidth: 36 });
    doc.text(nota.descricao, 48, y, { maxWidth: 70 });
    doc.text(formatarData(nota.data), 120, y);
    doc.text(formatarValor(nota.valor), 150, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  });

  const total = notasMes.reduce((soma, n) => soma + Number(n.valor), 0);
  y += 6;
  doc.setFont('helvetica','bold');
  doc.text(`Total do mês: ${formatarValor(total)}`, 10, y);

  doc.save(`Resumo-${mesNome(mesSelecionado)}.pdf`);
});
