/* script.js — renderizador e editor robusto
   Substitua totalmente o seu js/script.js por este arquivo.
   Suporta propriedades: title OR titulo, date OR data, text OR texto.
   Não salva no arquivo (somente atualiza em memória). Para persistir, descomente o trecho de localStorage.
*/

(function () {
  // util
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  // garantir que a variável global existe
  const RAW = window.REDACOES_DATA || [];
  if (!RAW.length) console.info('REDACOES_DATA vazio ou não encontrado. Verifique js/redacoes-data.js.');

  // Normaliza campos: cria array DATA com {id, title, date, text}
  const DATA = RAW.map(item => {
    return {
      id: Number(item.id),
      title: item.title || item.titulo || (`Redação ${item.id || '?'}`),
      date: item.date || item.data || '',
      text: item.text || item.texto || ''
    };
  });

  // Expõe DATA se necessário (ajuste local)
  window._REDACOES_RUNTIME = DATA;

  // Elementos
  const container = $('#articles-container');
  const paginationEl = $('#pagination');
  const editorPanel = $('#editor-panel');
  const editorTitle = $('#editor-title');
  const editorDate = $('#editor-date');
  const editorText = $('#editor-text');
  const saveBtn = $('#save-local');
  const exportBtn = $('#export-txt');
  const printBtn = $('#print-btn');
  const clearLocalBtn = $('#clear-local');
  const panelClose = $('#panel-close');

  let state = { page: 1, pageSize: 6, currentEditingId: null };

  // Render inicial quando DOM pronto
  document.addEventListener('DOMContentLoaded', () => {
    if (!container) {
      console.warn('Elemento #articles-container não encontrado — este script só funciona em redacoes.html');
      return;
    }
    renderArticles();
    attachGlobalListeners();
    // atualiza ano no footer se houver
    const y = new Date().getFullYear();
    $('#year-2') && ($('#year-2').textContent = y);
  });

  // RENDER: lista com preview e botões
  function renderArticles() {
    container.innerHTML = '';
    DATA.forEach(item => {
      const art = document.createElement('article');
      art.className = 'redacao-card';
      const preview = item.text ? (item.text.length > 220 ? item.text.slice(0, 220) + '…' : item.text) : '<i>Sem texto</i>';
      art.innerHTML = `
        <h3>${escapeHTML(item.title)}</h3>
        <p class="data">Data da produção: ${escapeHTML(item.date ? fmtDate(item.date) : '____')}</p>
        <p class="texto-placeholder">${escapeHTML(preview)}</p>
        <div class="actions actions-row">
          <button class="btn btn-open" data-id="${item.id}">Abrir</button>
          <button class="btn btn-export" data-id="${item.id}">Exportar .txt</button>
          <button class="btn btn-print" data-id="${item.id}">Imprimir</button>
        </div>
      `;
      container.appendChild(art);
    });

    // listeners dos botões (delegação alternativa)
    $$('.btn-open', container).forEach(b => b.addEventListener('click', e => openEditor(Number(b.dataset.id))));
    $$('.btn-export', container).forEach(b => b.addEventListener('click', e => exportAsTxtById(Number(b.dataset.id))));
    $$('.btn-print', container).forEach(b => b.addEventListener('click', e => printById(Number(b.dataset.id))));
  }

  // Abre editor lateral com conteúdo da redação
  function openEditor(id) {
    const item = DATA.find(x => x.id === id);
    if (!item) { alert('Redação não encontrada'); return; }
    state.currentEditingId = id;
    editorTitle.value = item.title || '';
    editorDate.value = item.date || '';
    editorText.value = item.text || '';
    editorPanel && editorPanel.setAttribute('aria-hidden', 'false');
  }

  function closeEditor() {
    state.currentEditingId = null;
    editorPanel && editorPanel.setAttribute('aria-hidden', 'true');
  }

  // Salvar (atualiza em memória; para persistir, descomente localStorage)
  function saveCurrentEdits() {
    if (!state.currentEditingId) return alert('Nenhuma redação aberta para salvar.');
    const item = DATA.find(x => x.id === state.currentEditingId);
    if (!item) return alert('Item não encontrado.');
    item.title = editorTitle.value.trim();
    item.date = editorDate.value || '';
    item.text = editorText.value;
    // atualizar a renderização
    renderArticles();
    // opcional: persistir em localStorage (descomente se quiser):
    // localStorage.setItem('redacoes_runtime', JSON.stringify(DATA));
    alert('Alterações aplicadas (em memória).');
  }

  // Exportar .txt
  function exportAsTxtById(id) {
    const item = DATA.find(x => x.id === id);
    if (!item) return alert('Redação não encontrada');
    const content = `${item.title}\nData: ${item.date || '____'}\n\n${item.text || ''}`;
    downloadBlob(content, `${slugify(item.title || 'redacao-' + id)}.txt`, 'text/plain;charset=utf-8');
  }

  // Imprimir
  function printById(id) {
    const item = DATA.find(x => x.id === id);
    if (!item) return alert('Redação não encontrada');
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<html><head><title>${escapeHTML(item.title)}</title><link rel="stylesheet" href="css/style.css"></head><body style="padding:24px;font-family:inherit;"><h1>${escapeHTML(item.title)}</h1><p><em>Data: ${escapeHTML(item.date || '____')}</em></p><article>${nl2br(escapeHTML(item.text || ''))}</article></body></html>`);
    w.document.close();
    setTimeout(()=>w.print(), 300);
  }

  // Download helper
  function downloadBlob(content, filename, mime){
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  // Attach editor buttons
  function attachGlobalListeners() {
    saveBtn && saveBtn.addEventListener('click', saveCurrentEdits);
    exportBtn && exportBtn.addEventListener('click', ()=>{ if(state.currentEditingId) exportAsTxtById(state.currentEditingId); });
    printBtn && printBtn.addEventListener('click', ()=>{ if(state.currentEditingId) printById(state.currentEditingId); });
    clearLocalBtn && clearLocalBtn.addEventListener('click', ()=> {
      if (!confirm('Remover dados locais (não afeta o arquivo js)?')) return;
      localStorage.removeItem('redacoes_runtime');
      alert('Dados locais (localStorage) removidos.');
    });
    panelClose && panelClose.addEventListener('click', closeEditor);

    // search na página
    const pageSearch = $('#page-search');
    if (pageSearch){
      pageSearch.addEventListener('input', ()=> filterByQuery(pageSearch.value));
      $('#page-search-clear')?.addEventListener('click', ()=>{ pageSearch.value=''; filterByQuery(''); });
    }
  }

  // Filtro simples por query (título + texto)
  function filterByQuery(q){
    q = (q||'').toLowerCase();
    const cards = $$('.redacao-card', container);
    DATA.forEach((item, idx) => {
      const match = item.title.toLowerCase().includes(q) || (item.text || '').toLowerCase().includes(q);
      cards[idx].style.display = match ? '' : 'none';
    });
  }

  // util helpers
  function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function nl2br(s){ return String(s||'').replace(/\n/g, '<br>'); }
  function slugify(s){ return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-'); }

})();
