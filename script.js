(() => {
  const OPS = [
    {key:'query', label:'Keywords/Phrases', placeholder:'e.g. machine learning research'},
    {key:'site', label:'site:', placeholder:'edu, gov, ac.uk, specific domain'},
    {key:'filetype', label:'filetype:', placeholder:'pdf, doc, ppt (for research papers)'},
    {key:'intitle', label:'intitle:', placeholder:'words in document title'},
    {key:'allintitle', label:'allintitle:', placeholder:'all words in title'},
    {key:'inurl', label:'inurl:', placeholder:'words in URL'},
    {key:'allinurl', label:'allinurl:', placeholder:'all words in URL'},
    {key:'intext', label:'intext:', placeholder:'words in document content'},
    {key:'after', label:'after:', placeholder:'YYYY-MM-DD (for recent research)'},
    {key:'before', label:'before:', placeholder:'YYYY-MM-DD (historical research)'},
    {key:'author', label:'author:', placeholder:'researcher or author name'},
    {key:'exclude', label:'Exclude (-term)', placeholder:'terms to exclude (comma separated)'}
  ];

  const EXAMPLES = [
    {title:'Academic PDFs', q:'site:edu filetype:pdf "research"'},
    {title:'Government Reports', q:'site:gov filetype:pdf report'},
    {title:'Conference Papers', q:'inurl:proceedings OR inurl:conference filetype:pdf'},
    {title:'Research Data', q:'filetype:xls OR filetype:csv "dataset"'},
    {title:'PhD Theses', q:'filetype:pdf "dissertation" OR "thesis"'},
    {title:'Academic Journals', q:'site:org "journal of" OR "review" intitle:research'},
    {title:'Research Grants', q:'filetype:pdf "grant proposal" OR "research grant"'},
    {title:'Scientific Studies', q:'"methodology" OR "results" OR "conclusion" site:edu'}
  ];

  const LS_PRESETS = 'research_presets_v2';
  const LS_HISTORY = 'research_history_v2';
  const LS_FAVORITES = 'research_favorites_v1';
  const LS_SETTINGS = 'research_settings_v1';

  // elements
  const form = document.getElementById('operators-form');
  const previewEl = document.getElementById('preview');
  const btnSearch = document.getElementById('btn-search');
  const btnCopy = document.getElementById('btn-copy');
  const btnClear = document.getElementById('btn-clear');
  const btnReset = document.getElementById('btn-reset');
  const presetsEl = document.getElementById('presets');
  const savedPresetsEl = document.getElementById('saved-presets');
  const btnSave = document.getElementById('btn-save');
  const historyEl = document.getElementById('history');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const favoriteBtn = document.getElementById('favorite-btn');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const operatorCountEl = document.getElementById('operator-count');
  const queryLengthEl = document.getElementById('query-length');
  const resultEstimateEl = document.getElementById('result-estimate');
  const complexityBar = document.getElementById('complexity-bar');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const shareModal = document.getElementById('share-modal');
  const shareLinkInput = document.getElementById('share-link-input');
  const copyShareLinkBtn = document.getElementById('copy-share-link');
  const modalClose = document.querySelector('.modal-close');
  const btnShareLink = document.getElementById('btn-share-link');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');

  // helper: create the input rows
  function createInputs(){
    form.innerHTML = '';
    OPS.forEach(op => {
      const row = document.createElement('div');
      row.className = 'op-row';
      const label = document.createElement('label');
      label.htmlFor = 'op_'+op.key;
      label.textContent = op.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'op_'+op.key;
      input.placeholder = op.placeholder || '';
      input.dataset.key = op.key;
      input.addEventListener('input', onInputChange);
      row.appendChild(label);
      row.appendChild(input);
      form.appendChild(row);
    });
  }

  // Build query string from fields
  function buildQuery(){
    const tokens = [];
    OPS.forEach(op => {
      const el = document.getElementById('op_'+op.key);
      if(!el) return;
      const raw = el.value.trim();
      if(!raw) return;
      switch(op.key){
        case 'query':
          tokens.push(raw);
          break;
        case 'exclude':
          raw.split(',').map(s=>s.trim()).filter(Boolean).forEach(t=> tokens.push('-' + quoteIfNeeded(t)));
          break;
        case 'allintitle':
        case 'allinurl':
          tokens.push(op.key + ':' + raw);
          break;
        default:
          tokens.push(op.key + ':' + quoteIfNeeded(raw));
      }
    });
    
    // Add advanced options
    const language = document.getElementById('search-language').value;
    if (language) tokens.push(language);
    
    const region = document.getElementById('search-region').value;
    if (region) tokens.push(region);
    
    const timeRange = document.getElementById('time-range').value;
    if (timeRange && timeRange !== 'custom') tokens.push('d' + timeRange);
    
    const usageRights = document.getElementById('usage-rights').value;
    if (usageRights) tokens.push(usageRights);
    
    const safeSearch = document.getElementById('safe-search').value;
    if (safeSearch !== 'medium') tokens.push('safe=' + safeSearch);
    
    return tokens.join(' ').replace(/\s+/g,' ').trim();
  }

  function quoteIfNeeded(s){
    if(!s) return s;
    if(/\s/.test(s) || /[\"()]/.test(s)) return '"' + s + '"';
    return s;
  }

  function updatePreview(){
    const q = buildQuery();
    previewEl.textContent = q || '(your research query will appear here)';
    const has = Boolean(q);
    btnSearch.disabled = !has;
    btnCopy.disabled = !has;
    btnSave.disabled = !has;
    
    // Update stats
    updateStats(q);
    
    // Check if this query is favorited
    checkIfFavorited(q);
  }
  
  function updateStats(query) {
    // Count operators
    const operatorCount = OPS.reduce((count, op) => {
      const el = document.getElementById('op_' + op.key);
      return count + (el && el.value.trim() ? 1 : 0);
    }, 0);
    
    // Add advanced options to count
    const language = document.getElementById('search-language').value;
    const region = document.getElementById('search-region').value;
    const timeRange = document.getElementById('time-range').value;
    const usageRights = document.getElementById('usage-rights').value;
    const safeSearch = document.getElementById('safe-search').value;
    
    if (language) operatorCount++;
    if (region) operatorCount++;
    if (timeRange && timeRange !== 'custom') operatorCount++;
    if (usageRights) operatorCount++;
    if (safeSearch !== 'medium') operatorCount++;
    
    operatorCountEl.textContent = operatorCount;
    
    // Query length
    queryLengthEl.textContent = query.length;
    
    // Estimate results (simulated)
    const complexity = Math.min(100, Math.floor(operatorCount * 8 + query.length / 3));
    complexityBar.style.width = complexity + '%';
    
    // Simple heuristic for result estimation
    let estimate = 'N/A';
    if (query.length > 10) {
      const est = Math.max(100, 1000000 / (operatorCount * 5 + 1));
      estimate = est > 10000 ? Math.floor(est / 1000) + 'K+' : Math.floor(est);
    }
    resultEstimateEl.textContent = estimate;
  }
  
  function checkIfFavorited(query) {
    const favorites = getFavorites();
    const isFavorited = favorites.some(fav => fav.query === query);
    
    if (isFavorited) {
      favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
      favoriteBtn.classList.add('active');
    } else {
      favoriteBtn.innerHTML = '<i class="far fa-star"></i>';
      favoriteBtn.classList.remove('active');
    }
  }
  
  function getFavorites() {
    const raw = localStorage.getItem(LS_FAVORITES);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }
  
  function saveFavorite() {
    const q = buildQuery();
    if(!q){ alert('Nothing to favorite.'); return; }
    
    const defaultName = q.length > 40 ? q.slice(0,40) + '...' : q;
    const name = prompt('Favorite name:', defaultName);
    if(!name) return;
    
    const favorites = getFavorites();
    favorites.push({name, query: q, timestamp: Date.now()});
    localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites));
    
    checkIfFavorited(q);
    showToast('Query added to favorites!');
  }

  function onInputChange(){
    updatePreview();
  }

  // Open Google with the encoded query
  function openSearch(){
    const q = buildQuery();
    if(!q){ alert('Please build a query first.'); return; }
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(q);
    window.open(url, '_blank');
    pushHistory(q);
  }

  // Copy plain query to clipboard
  function copyQuery(){
    const q = buildQuery();
    if(!q){ showToast('Nothing to copy.', 'error'); return; }
    navigator.clipboard.writeText(q).then(()=>{
      showToast('Query copied to clipboard!');
    }).catch(()=> showToast('Unable to copy. Your browser may block clipboard access.', 'error'));
  }

  function clearForm(){
    OPS.forEach(op=>{ 
      const el = document.getElementById('op_'+op.key); 
      if(el) el.value=''; 
    });
    
    // Clear advanced options
    document.getElementById('search-language').value = '';
    document.getElementById('search-region').value = '';
    document.getElementById('time-range').value = '';
    document.getElementById('usage-rights').value = '';
    document.getElementById('safe-search').value = 'medium';
    
    updatePreview();
  }

  // Presets
  function loadExamples(){
    presetsEl.innerHTML = '';
    EXAMPLES.forEach(ex=>{
      const b = document.createElement('button');
      b.className = 'preset-chip';
      b.innerHTML = '<i class="fas fa-magic"></i> ' + ex.title;
      b.title = ex.q;
      b.addEventListener('click', ()=> applyPresetQuery(ex.q));
      presetsEl.appendChild(b);
    });
  }

  // Apply a preset query: populate fields using regex for known operators
  function applyPresetQuery(q){
    clearForm();
    // find operator matches
    // match patterns like key:"..." or key:token
    OPS.forEach(op=>{
      const el = document.getElementById('op_'+op.key);
      if(!el) return;
      const regex = new RegExp(op.key + ':(\"[^\"]+\"|[^\\s]+)', 'i');
      const m = q.match(regex);
      if(m){
        let val = m[1];
        if(val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1);
        el.value = val;
      }
    });
    // Remove matched operator tokens to get plain query remnants
    let remainder = q.replace(/\S+:"[^"]+"/g,'').replace(/\S+:\S+/g,'').trim();
    // remove boolean words
    remainder = remainder.replace(/\b(AND|OR|NOT)\b/gi,'').trim();
    const qEl = document.getElementById('op_query');
    if(qEl) qEl.value = remainder;
    updatePreview();
  }

  // Saved presets in localStorage
  function loadSavedPresets(){
    const raw = localStorage.getItem(LS_PRESETS);
    let arr = [];
    try{ arr = raw ? JSON.parse(raw) : []; }catch(e){ arr = []; }
    renderSavedPresets(arr);
  }

  function renderSavedPresets(arr){
    savedPresetsEl.innerHTML = '';
    if(!arr.length){ savedPresetsEl.innerHTML = '<div class="muted">No saved research queries. Create one using "Save for Research".</div>'; return; }
    arr.forEach((p, i)=>{
      const chip = document.createElement('div');
      chip.className = 'preset-chip';
      chip.textContent = p.name;
      chip.title = p.query;
      chip.addEventListener('click', ()=> applyPresetQuery(p.query));

      const del = document.createElement('button');
      del.textContent = '✕';
      del.style.background = 'none';
      del.style.border = 'none';
      del.style.cursor = 'pointer';
      del.style.marginLeft = '8px';
      del.addEventListener('click', (ev)=>{ ev.stopPropagation(); removePreset(i); });

      chip.appendChild(del);
      savedPresetsEl.appendChild(chip);
    });
  }

  function savePreset(){
    const q = buildQuery();
    if(!q){ showToast('Nothing to save.', 'error'); return; }
    const defaultName = q.length > 40 ? q.slice(0,40) + '...' : q;
    const name = prompt('Research query name:', defaultName);
    if(!name) return;
    const raw = localStorage.getItem(LS_PRESETS);
    let arr = [];
    try{ arr = raw ? JSON.parse(raw) : []; }catch(e){ arr = []; }
    arr.unshift({name,query:q});
    localStorage.setItem(LS_PRESETS, JSON.stringify(arr.slice(0,50)));
    loadSavedPresets();
    showToast('Query saved successfully!');
  }

  function removePreset(index){
    const raw = localStorage.getItem(LS_PRESETS);
    let arr = [];
    try{ arr = raw ? JSON.parse(raw) : []; }catch(e){ arr = []; }
    arr.splice(index,1);
    localStorage.setItem(LS_PRESETS, JSON.stringify(arr));
    loadSavedPresets();
  }

  // History (last 30)
  function pushHistory(q){
    let arr = [];
    try{ arr = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }catch(e){ arr = []; }
    arr.unshift({q,ts:Date.now()});
    localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0,30)));
    renderHistory();
  }

  function renderHistory(){
    let arr = [];
    try{ arr = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }catch(e){ arr = []; }
    historyEl.innerHTML = '';
    if(!arr.length){ historyEl.innerHTML = '<div class="muted">No search history yet.</div>'; return; }
    
    arr.forEach((item, index)=>{
      const d = new Date(item.ts);
      const el = document.createElement('div');
      el.className = 'hist-item';
      
      const content = document.createElement('div');
      content.className = 'hist-item-content';
      content.textContent = item.q + '  — ' + d.toLocaleString();
      content.title = 'Click to copy this research query';
      content.addEventListener('click', ()=>{ 
        navigator.clipboard.writeText(item.q).then(()=>{ 
          showToast('Research query copied from history'); 
        }).catch(()=>{ 
          showToast('Copy failed', 'error'); 
        }); 
      });
      
      const actions = document.createElement('div');
      actions.className = 'hist-item-actions';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'hist-delete';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Delete this history item';
      deleteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        removeHistoryItem(index);
      });
      
      actions.appendChild(deleteBtn);
      el.appendChild(content);
      el.appendChild(actions);
      historyEl.appendChild(el);
    });
  }
  
  function removeHistoryItem(index) {
    let arr = [];
    try{ arr = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }catch(e){ arr = []; }
    if (index >= 0 && index < arr.length) {
      arr.splice(index, 1);
      localStorage.setItem(LS_HISTORY, JSON.stringify(arr));
      renderHistory();
    }
  }
  
  function clearHistory() {
    if (confirm('Are you sure you want to clear all search history?')) {
      localStorage.setItem(LS_HISTORY, JSON.stringify([]));
      renderHistory();
      showToast('History cleared successfully');
    }
  }
  
  // Tab functionality
  function setupTabs() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show correct content
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === tabName + '-tab') {
            content.classList.add('active');
          }
        });
      });
    });
  }
  
  // Dark mode functionality
  function setupDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    darkModeToggle.checked = isDarkMode;
    toggleDarkMode(isDarkMode);
    
    darkModeToggle.addEventListener('change', (e) => {
      toggleDarkMode(e.target.checked);
      localStorage.setItem('darkMode', e.target.checked);
    });
  }
  
  function toggleDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
  
  // Toast notification
  function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.background = 'var(--danger)';
    } else {
      toast.style.background = 'var(--success)';
    }
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // Share functionality
  function setupShareFunctionality() {
    // Share as link
    btnShareLink.addEventListener('click', () => {
      const query = buildQuery();
      if (!query) {
        showToast('Please build a query first', 'error');
        return;
      }
      
      // Create a shareable link
      const shareLink = window.location.href.split('?')[0] + '?q=' + encodeURIComponent(query);
      shareLinkInput.value = shareLink;
      shareModal.classList.add('show');
    });
    
    // Export as JSON
    btnExportJson.addEventListener('click', () => {
      const query = buildQuery();
      if (!query) {
        showToast('Please build a query first', 'error');
        return;
      }
      
      const queryData = {
        query: query,
        timestamp: new Date().toISOString(),
        operators: OPS.map(op => {
          const el = document.getElementById('op_' + op.key);
          return {
            type: op.key,
            value: el ? el.value : ''
          };
        }),
        advanced: {
          language: document.getElementById('search-language').value,
          region: document.getElementById('search-region').value,
          timeRange: document.getElementById('time-range').value,
          usageRights: document.getElementById('usage-rights').value,
          safeSearch: document.getElementById('safe-search').value
        }
      };
      
      downloadFile(JSON.stringify(queryData, null, 2), 'query.json', 'application/json');
      showToast('JSON file downloaded');
    });
    
    // Export query configuration
    btnExport.addEventListener('click', () => {
      const queryData = getQueryConfiguration();
      downloadFile(JSON.stringify(queryData, null, 2), 'dork-query-config.json', 'application/json');
      showToast('Query configuration exported');
    });
    
    // Import query configuration
    btnImport.addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const queryData = JSON.parse(e.target.result);
          importQueryConfiguration(queryData);
          showToast('Query configuration imported successfully');
        } catch (err) {
          showToast('Error importing query configuration', 'error');
          console.error(err);
        }
      };
      reader.readAsText(file);
      // Reset the file input
      importFile.value = '';
    });
    
    // Copy share link
    copyShareLinkBtn.addEventListener('click', () => {
      shareLinkInput.select();
      document.execCommand('copy');
      showToast('Link copied to clipboard');
    });
    
    // Close modal
    modalClose.addEventListener('click', () => {
      shareModal.classList.remove('show');
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === shareModal) {
        shareModal.classList.remove('show');
      }
    });
  }
  
  // Get current query configuration
  function getQueryConfiguration() {
    return {
      operators: OPS.map(op => {
        const el = document.getElementById('op_' + op.key);
        return {
          type: op.key,
          value: el ? el.value : ''
        };
      }),
      advanced: {
        language: document.getElementById('search-language').value,
        region: document.getElementById('search-region').value,
        timeRange: document.getElementById('time-range').value,
        usageRights: document.getElementById('usage-rights').value,
        safeSearch: document.getElementById('safe-search').value
      },
      query: buildQuery(),
      timestamp: new Date().toISOString()
    };
  }
  
  // Import query configuration
  function importQueryConfiguration(queryData) {
    // Clear form first
    clearForm();
    
    // Set operator values
    if (queryData.operators) {
      queryData.operators.forEach(op => {
        const el = document.getElementById('op_' + op.type);
        if (el) el.value = op.value;
      });
    }
    
    // Set advanced options
    if (queryData.advanced) {
      document.getElementById('search-language').value = queryData.advanced.language || '';
      document.getElementById('search-region').value = queryData.advanced.region || '';
      document.getElementById('time-range').value = queryData.advanced.timeRange || '';
      document.getElementById('usage-rights').value = queryData.advanced.usageRights || '';
      document.getElementById('safe-search').value = queryData.advanced.safeSearch || 'medium';
    }
    
    updatePreview();
  }
  
  // Download file helper
  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  // Parse query from URL
  function parseQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
      try {
        // Decode and apply the query
        const decodedQuery = decodeURIComponent(query);
        applyPresetQuery(decodedQuery);
        showToast('Query loaded from URL');
      } catch (e) {
        console.error('Error parsing query from URL', e);
      }
    }
  }

  // Reset demo: apply first example
  function resetExamples(){ applyPresetQuery(EXAMPLES[0].q); }

  // init
  createInputs();
  loadExamples();
  loadSavedPresets();
  renderHistory();
  updatePreview();
  setupTabs();
  setupDarkMode();
  setupShareFunctionality();
  parseQueryFromURL(); // Check for query in URL on page load

  // events
  btnSearch.addEventListener('click', openSearch);
  btnCopy.addEventListener('click', copyQuery);
  btnClear.addEventListener('click', clearForm);
  btnReset.addEventListener('click', resetExamples);
  btnSave.addEventListener('click', savePreset);
  btnClearHistory.addEventListener('click', clearHistory);
  favoriteBtn.addEventListener('click', saveFavorite);

})();