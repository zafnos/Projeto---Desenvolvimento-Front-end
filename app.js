(() => {
      'use strict';
      const dialogoSobre = document.getElementById('dialogo-sobre');
      document.getElementById('abrir-sobre').addEventListener('click', () => dialogoSobre.showModal());
      document.getElementById('fechar-sobre').addEventListener('click', () => dialogoSobre.close());
      dialogoSobre.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') evento.stopPropagation();
      });
      const svg = document.getElementById('mapa');
      const estado = document.getElementById('estado-mapa');

      function erroVisivel(mensagem) {
        estado.textContent = mensagem;
        console.error(mensagem);
      }

      if (!window.CAMPUS_DATA) {
        erroVisivel('Não foi possível carregar campus-data.js. Verifique se o arquivo está na mesma pasta do index.html.');
        return;
      }
      if (!window.CampusMap || typeof window.CampusMap.render !== 'function') {
        erroVisivel('Não foi possível carregar o campus-map.js original. Restaure esse arquivo pelo GitHub.');
        return;
      }

      const painel = window.CampusDescriptions.inicializar();
      const sliderZoom = document.getElementById('slider-zoom');
      let mapa;
      try {
        mapa = window.CampusMap.render(svg, window.CAMPUS_DATA, {
          rotacao: 22,
          onZoom: nivel => { sliderZoom.value = nivel; },
          onClick: (predio, evento) => {
            if (!predio) { painel.fechar(); return; }
            painel.mostrar(predio, evento, svg);
          },
          onHover: predio => {
            svg.setAttribute('aria-label', predio ? 'Mapa do campus — ' + predio.nome : 'Mapa ilustrado do campus UNIPÊ');
          }
        });
      } catch (erro) {
        console.error('Erro ao desenhar o mapa:', erro);
        erroVisivel('O mapa não conseguiu ser desenhado. Abra o Console do navegador (F12) para ver o erro.');
        return;
      }

      window.mapa = mapa;

      const categorias = {
        laranja: 'academico', vermelha: 'academico', psicologia: 'clinicas', ciano: 'clinicas',
        eva: 'vivencia', biblioteca: 'vivencia', rh: 'vivencia', 'eng-civil': 'clinicas',
        medicina: 'academico', reitoria: 'vivencia', museu: 'vivencia', odontologia: 'clinicas',
        'odonto-anexos': 'clinicas', ginasio: 'esportes', pos: 'academico', 'ed-fisica': 'academico',
        ct: 'clinicas', 'apoio-piscina': 'esportes', 'apoio-quadra': 'esportes',
        'apoio-sul': 'esportes', entrada: 'esportes', passarela: 'esportes'
      };
      const lista = document.getElementById('lista-locais');
      const painelLocais = document.getElementById('painel-locais');
      const botaoLocais = document.getElementById('btn-locais-toggle');
      const inputBusca = document.getElementById('input-busca');
      const resultados = document.getElementById('resultados-busca');
      const limparBusca = document.getElementById('btn-limpar-busca');
      let categoria = 'todos';

      function abrirPredio(predio) {
        mapa.selecionar(predio.id);
        mapa.focar(predio.id, { zoom: 2.9 });
        painel.mostrar(predio);
      }

      function etiqueta(predio, texto) {
        const badge = document.createElement('span');
        badge.className = 'badge-sigla-item';
        badge.style.backgroundColor = predio.corQuadra || '#0c2d57';
        badge.textContent = texto || predio.sigla || predio.id.toUpperCase();
        return badge;
      }

      function renderizarLocais() {
        const filtrados = mapa.predios.filter(p => categoria === 'todos' || categorias[p.id] === categoria);
        document.getElementById('titulo-lista-locais').textContent = `Locais do Campus (${filtrados.length})`;
        lista.replaceChildren();
        filtrados.forEach(predio => {
          const li = document.createElement('li');
          const botao = document.createElement('button');
          botao.type = 'button';
          botao.className = 'btn-item-local';
          const nome = document.createElement('span');
          nome.textContent = predio.nome;
          botao.append(etiqueta(predio), nome);
          botao.addEventListener('click', () => abrirPredio(predio));
          botao.addEventListener('mouseenter', () => predio.el.classList.add('destacado-quadra'));
          botao.addEventListener('mouseleave', () => predio.el.classList.remove('destacado-quadra'));
          li.append(botao);
          lista.append(li);
        });
      }
      renderizarLocais();
      document.querySelectorAll('.chip-categoria').forEach(botao => botao.addEventListener('click', () => {
        categoria = botao.dataset.cat;
        document.querySelectorAll('.chip-categoria').forEach(chip => {
          const ativo = chip === botao;
          chip.classList.toggle('ativo', ativo);
          chip.setAttribute('aria-pressed', String(ativo));
        });
        renderizarLocais();
      }));
      function exibirLocais(exibir) {
        painelLocais.hidden = !exibir;
        botaoLocais.setAttribute('aria-expanded', String(exibir));
      }
      botaoLocais.addEventListener('click', () => exibirLocais(painelLocais.hidden));
      document.getElementById('btn-fechar-locais').addEventListener('click', () => exibirLocais(false));

      const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      function fecharResultados() {
        resultados.hidden = true;
        inputBusca.setAttribute('aria-expanded', 'false');
      }
      function buscar() {
        const termo = normalizar(inputBusca.value.trim());
        limparBusca.hidden = !termo;
        resultados.replaceChildren();
        if (!termo) { fecharResultados(); return; }
        const encontrados = [];
        mapa.predios.forEach(p => {
          const info = window.CampusDescriptions.dados[p.id] || {};
          if (normalizar([p.nome, p.sigla, p.quadra, ...(p.inclui || []), p.cursos, p.descricao, info.titulo, info.cursos, info.descricao].join(' ')).includes(termo)) {
            encontrados.push({ predio: p, titulo: p.nome, subtitulo: 'Quadra ' + p.quadra });
          }
        });
        (window.CAMPUS_DATA.pontos || []).forEach(p => {
          if (p.tipo !== 'predio' && normalizar(p.nome).includes(termo)) {
            const predio = p.predio && mapa.predio(p.predio);
            encontrados.push({ predio, ponto: p, titulo: p.nome, subtitulo: predio ? 'Em ' + predio.nome : 'Ponto do campus' });
          }
        });
        if (!encontrados.length) {
          const vazio = document.createElement('p');
          vazio.className = 'busca-vazia';
          vazio.textContent = 'Nenhum local encontrado.';
          resultados.append(vazio);
        }
        encontrados.slice(0, 8).forEach(item => {
          const botao = document.createElement('button');
          botao.type = 'button';
          botao.className = 'item-resultado-busca';
          const texto = document.createElement('span');
          const titulo = document.createElement('strong');
          const subtitulo = document.createElement('small');
          titulo.textContent = item.titulo;
          subtitulo.textContent = item.subtitulo;
          texto.append(titulo, subtitulo);
          botao.append(etiqueta(item.predio || { id: 'local' }, item.ponto ? 'LOCAL' : null), texto);
          botao.addEventListener('click', () => {
            fecharResultados();
            if (item.predio) abrirPredio(item.predio);
            else if (item.ponto && item.ponto.xy) { painel.fechar(); mapa.focarPonto(item.ponto.xy, 3.2); }
          });
          resultados.append(botao);
        });
        resultados.hidden = false;
        inputBusca.setAttribute('aria-expanded', 'true');
      }
      inputBusca.addEventListener('input', buscar);
      inputBusca.addEventListener('focus', () => { if (inputBusca.value.trim()) buscar(); });
      inputBusca.addEventListener('keydown', e => {
        if (e.key === 'Escape') fecharResultados();
        if (e.key === 'Enter') { const primeiro = resultados.querySelector('button'); if (primeiro && !resultados.hidden) { e.preventDefault(); primeiro.click(); } }
      });
      limparBusca.addEventListener('click', () => { inputBusca.value = ''; buscar(); inputBusca.focus(); });
      document.addEventListener('click', e => { if (!e.target.closest('.caixa-busca')) fecharResultados(); });

      document.getElementById('btn-zoom-in').addEventListener('click', () => mapa.zoomIn());
      document.getElementById('btn-zoom-out').addEventListener('click', () => mapa.zoomOut());
      document.getElementById('btn-reset').addEventListener('click', () => mapa.resetar());
      sliderZoom.addEventListener('input', () => mapa.setZoom(Number(sliderZoom.value)));
      [['btn-modo-quadras', 'setModoQuadras'], ['btn-rotulos', 'setMostrarRotulos']].forEach(([id, metodo]) => {
        const botao = document.getElementById(id);
        botao.addEventListener('click', () => {
          const ativo = botao.getAttribute('aria-pressed') !== 'true';
          botao.setAttribute('aria-pressed', String(ativo));
          botao.classList.toggle('ativo', ativo);
          mapa[metodo](ativo);
        });
      });
    })();
