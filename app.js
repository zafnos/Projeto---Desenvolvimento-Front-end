(() => {
      'use strict';
      const svg = document.getElementById('mapa');
      const busca = document.getElementById('busca-predio');
      const resultados = document.getElementById('resultados-predios');
      const estado = document.getElementById('estado-pesquisa');

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
      let mapa;
      try {
        mapa = window.CampusMap.render(svg, window.CAMPUS_DATA, {
          rotacao: 22,
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
      const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

      busca.addEventListener('input', () => {
        const termo = normalizar(busca.value);
        resultados.replaceChildren();
        estado.textContent = '';
        if (!termo) return;
        const encontrados = mapa.predios.filter(predio => normalizar(predio.nome).includes(termo));
        encontrados.forEach(predio => {
          const li = document.createElement('li');
          const botao = document.createElement('button');
          botao.type = 'button';
          botao.textContent = predio.nome;
          botao.addEventListener('click', () => {
            mapa.selecionar(predio.id);
            mapa.focar(predio.id, { zoom: 3 });
            painel.mostrar(predio);
            busca.value = predio.nome;
            resultados.replaceChildren();
            estado.textContent = predio.nome + ' selecionado no mapa.';
          });
          li.appendChild(botao);
          resultados.appendChild(li);
        });
        estado.textContent = encontrados.length ? encontrados.length + ' resultado(s) encontrado(s).' : 'Nenhum prédio encontrado.';
      });

      busca.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') {
          resultados.replaceChildren();
          estado.textContent = '';
        }
      });
    })();
