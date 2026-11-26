(() => {
      'use strict';
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
    })();
