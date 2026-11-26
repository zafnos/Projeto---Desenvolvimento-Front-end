/*
 * campus-descricoes.js
 * Complemento do renderizador ORIGINAL do projeto Localiza Unipê.
 * Não declara nem substitui window.CampusMap.
 */
(function (global) {
  'use strict';

  const DESCRICOES_UNIDADES = {
    laranja: {
      titulo: 'Blocos A, B e C (Quadra Laranja)',
      quadra: 'laranja',
      descricao: 'Principal complexo de salas de aula e laboratórios de tecnologia do campus. Formado por duas grandes alas espelhadas com pátio arborizado central e espaços de alimentação (Tapiocabana e EVS).',
      cursos: 'Ciência da Computação, Sistemas para Internet, ADS, Direito, Administração e Ciências Contábeis',
      horario: 'Seg a Sex: 07h às 22h | Sáb: 08h às 12h'
    },
    vermelha: {
      titulo: 'Blocos D, E e F (Quadra Vermelha)',
      quadra: 'vermelha',
      descricao: 'Conjunto de três blocos acadêmicos paralelos interligados por passarela central coberta. Abriga salas de aula, coordenações e o posto de Primeiros Socorros.',
      cursos: 'Direito, Psicologia, Ciências Contábeis e Gestão',
      horario: 'Seg a Sex: 07h às 22h | Sáb: 08h às 12h'
    },
    psicologia: {
      titulo: 'Clínica-Escola de Psicologia (Bloco F)',
      quadra: 'vermelha',
      descricao: 'Espaço dedicado às práticas acadêmicas e atendimento psicológico à comunidade, equipado com salas de observação e consultórios.',
      cursos: 'Psicologia',
      horario: 'Seg a Sex: 08h às 20h'
    },
    ciano: {
      titulo: 'Blocos G, H e I – Fisioterapia, Fonoaudiologia e Arquitetura',
      quadra: 'ciano',
      descricao: 'Complexo da Quadra Ciano que reúne a Clínica-Escola de Fisioterapia, laboratórios de Fonoaudiologia e os ateliês de projeto de Arquitetura e Urbanismo.',
      cursos: 'Fisioterapia, Fonoaudiologia e Arquitetura e Urbanismo',
      horario: 'Seg a Sex: 07h às 22h'
    },
    eva: {
      titulo: 'EVA – Espaço de Vivência Acadêmica',
      quadra: 'azul',
      descricao: 'Coração social do campus UNIPÊ. Pavilhão amplo reunindo praça de alimentação, Central de Atendimento ao Aluno (CAA), lojas e áreas de convivência.',
      cursos: 'Convivência Geral e Atendimento ao Estudante (CAA)',
      horario: 'Seg a Sex: 07h às 21h30 | Sáb: 08h às 12h'
    },
    biblioteca: {
      titulo: 'Biblioteca Central UNIPÊ',
      quadra: 'azul',
      descricao: 'Edifício amplo com pátio interno arborizado na Quadra Azul. Oferece vasto acervo bibliográfico físico e digital, cabines individuais e salas de estudo em grupo.',
      cursos: 'Todos os cursos de Graduação e Pós-Graduação',
      horario: 'Seg a Sex: 07h30 às 22h | Sáb: 08h às 12h'
    },
    reitoria: {
      titulo: 'Reitoria e Administração Central',
      quadra: 'azul',
      descricao: 'Edifício sede da administração superior do UNIPÊ, abrigando o Gabinete da Reitoria, Pró-Reitorias Acadêmicas e Secretaria Geral.',
      cursos: 'Administração Institucional',
      horario: 'Seg a Sex: 08h às 18h'
    },
    museu: {
      titulo: 'Museu UNIPÊ',
      quadra: 'azul',
      descricao: 'Espaço cultural localizado na área arborizada da Quadra Azul, próximo ao lago, preservando a memória histórica da instituição.',
      cursos: 'Cultura e Extensão',
      horario: 'Seg a Sex: 08h às 17h'
    },
    rh: {
      titulo: 'Blocos M e N – Enfermagem e Recursos Humanos',
      quadra: 'esmeralda',
      descricao: 'Localizado na Quadra Esmeralda, abriga as salas e laboratórios de Enfermagem, além do setor de Recursos Humanos.',
      cursos: 'Enfermagem e Gestão de Recursos Humanos',
      horario: 'Seg a Sex: 07h30 às 21h'
    },
    'eng-civil': {
      titulo: 'Blocos O e P – Complexo de Engenharia Civil',
      quadra: 'esmeralda',
      descricao: 'Complexo laboratorial da Quadra Esmeralda voltado às práticas de Engenharia Civil, ensaios de materiais, estruturas, solos e hidráulica.',
      cursos: 'Engenharia Civil e Arquitetura e Urbanismo',
      horario: 'Seg a Sex: 07h30 às 22h'
    },
    medicina: {
      titulo: 'Auditório UNIPÊ e Medicina (Blocos S e T)',
      quadra: 'verde',
      descricao: 'Complexo da Quadra Verde próximo à Portaria 2. Reúne o grande Auditório Central e os blocos exclusivos do curso de Medicina com laboratórios de simulação.',
      cursos: 'Medicina',
      horario: 'Seg a Sex: 07h às 22h'
    },
    odontologia: {
      titulo: 'Bloco Q – Clínica-Escola de Odontologia',
      quadra: 'bege',
      descricao: 'Complexo da Quadra Bege com clínicas odontológicas integradas para aulas práticas e atendimento especializado à comunidade.',
      cursos: 'Odontologia',
      horario: 'Seg a Sex: 07h30 às 21h'
    },
    'odonto-anexos': {
      titulo: 'Bloco R – Anexos de Odontologia',
      quadra: 'bege',
      descricao: 'Edificações de apoio técnico, esterilização e laboratórios anexos ao complexo de Odontologia.',
      cursos: 'Odontologia',
      horario: 'Seg a Sex: 07h30 às 21h'
    },
    ginasio: {
      titulo: 'Ginásio Poliesportivo UNIPÊ',
      quadra: 'amarela',
      descricao: 'Grande ginásio coberto da Quadra Amarela, palco de competições universitárias, aulas práticas de esportes coletivos e eventos.',
      cursos: 'Educação Física e Esportes Universitários',
      horario: 'Seg a Sex: 07h às 22h | Sáb: 08h às 14h'
    },
    pos: {
      titulo: 'Bloco J – Pós-Graduação e Pesquisa',
      quadra: 'amarela',
      descricao: 'Edifício voltado aos cursos de pós-graduação lato e stricto sensu, MBA e grupos de pesquisa.',
      cursos: 'Pós-Graduação, MBA e Mestrados',
      horario: 'Seg a Sex: 08h às 22h | Sáb: 08h às 17h'
    },
    'ed-fisica': {
      titulo: 'Bloco L – Educação Física',
      quadra: 'amarela',
      descricao: 'Bloco acadêmico integrado ao Complexo Esportivo com salas e laboratórios de fisiologia do exercício.',
      cursos: 'Educação Física',
      horario: 'Seg a Sex: 07h às 22h'
    },
    ct: {
      titulo: 'Bloco K – Complexo de Tecnologia (CT)',
      quadra: 'amarela',
      descricao: 'Concentra laboratórios técnicos e salas de prática entre o Ginásio e o Bloco de Educação Física.',
      cursos: 'Tecnologia, Engenharias e Educação Física',
      horario: 'Seg a Sex: 07h às 22h'
    },
    'apoio-piscina': {
      titulo: 'Complexo Aquático e Piscina Semiolímpica',
      quadra: 'amarela',
      descricao: 'Piscina semiolímpica com 6 raias utilizada para aulas práticas de natação, hidroterapia e treinamentos.',
      cursos: 'Educação Física e Fisioterapia',
      horario: 'Seg a Sex: 07h às 21h'
    },
    'apoio-quadra': {
      titulo: 'Quadras Externas e Areia',
      quadra: 'amarela',
      descricao: 'Área de quadras abertas e de areia ao lado do complexo aquático e da pista de atletismo.',
      cursos: 'Educação Física',
      horario: 'Seg a Sex: 07h às 21h'
    },
    entrada: {
      titulo: 'Portaria Principal (BR-230)',
      quadra: 'amarela',
      descricao: 'Acesso principal de veículos e pedestres ao campus UNIPÊ pela rodovia BR-230 (Km 22).',
      cursos: 'Acesso Principal ao Campus',
      horario: 'Seg a Sáb: 06h às 23h'
    },
    passarela: {
      titulo: 'Passarela Elevada (BR-230)',
      quadra: 'amarela',
      descricao: 'Passarela de travessia segura sobre a BR-230 conectando as paradas de ônibus à Portaria Principal.',
      cursos: 'Acesso de Pedestres',
      horario: '24 horas'
    }
  };

  const NOMES_QUADRA = {
    laranja: 'Quadra Laranja', vermelha: 'Quadra Vermelha',
    ciano: 'Quadra Ciano', azul: 'Quadra Azul',
    esmeralda: 'Quadra Esmeralda', verde: 'Quadra Verde',
    bege: 'Quadra Bege', amarela: 'Quadra Amarela • Esportes'
  };

  function preencherLista(lista, predio, info) {
    lista.replaceChildren();
    const adicionar = (rotulo, valor) => {
      if (!valor || (Array.isArray(valor) && !valor.length)) return;
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = rotulo + ': ';
      li.append(strong, document.createTextNode(Array.isArray(valor) ? valor.join(', ') : String(valor)));
      lista.appendChild(li);
    };
    adicionar('Sigla', predio.sigla);
    adicionar('Setores', predio.inclui);
    adicionar('Cursos / Áreas', predio.cursos || info.cursos);
    adicionar('Horário', predio.horario || info.horario);
  }

  function inicializarCampusDescricoes() {
    const painel = document.getElementById('painel-local');
    const fechar = document.getElementById('fechar-painel');
    const categoria = document.getElementById('local-categoria');
    const titulo = document.getElementById('local-titulo');
    const descricao = document.getElementById('local-descricao');
    const lista = document.getElementById('local-info');
    const areaMapa = document.querySelector('.area-mapa');
    if (!painel || !fechar || !categoria || !titulo || !descricao || !lista || !areaMapa) {
      console.error('Painel de descrição incompleto. Confira os IDs no index.html.');
      return { mostrar() {}, fechar() {} };
    }

    function fecharPainel() {
      painel.hidden = true;
      painel.classList.remove('painel-esquerda', 'painel-direita');
    }

    function obterPonto(predio, evento, svg) {
      const area = areaMapa.getBoundingClientRect();

      if (evento && Number.isFinite(evento.clientX) && Number.isFinite(evento.clientY)) {
        return { x: evento.clientX - area.left, y: evento.clientY - area.top };
      }

      if (predio && predio.el && typeof predio.el.getBoundingClientRect === 'function') {
        const r = predio.el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - area.left, y: r.top + r.height / 2 - area.top };
      }

      if (svg && predio && Number.isFinite(predio.cx) && Number.isFinite(predio.cy) && svg.createSVGPoint) {
        const p = svg.createSVGPoint();
        p.x = predio.cx;
        p.y = predio.cy;
        const tela = p.matrixTransform(svg.getScreenCTM());
        return { x: tela.x - area.left, y: tela.y - area.top };
      }

      return { x: area.width / 2, y: area.height / 2 };
    }

    function posicionarPainel(predio, evento, svg) {
      const area = areaMapa.getBoundingClientRect();
      const ponto = obterPonto(predio, evento, svg);
      const margem = 12;
      const distancia = 18;

      painel.hidden = false;
      painel.classList.remove('painel-esquerda', 'painel-direita');

      const largura = painel.offsetWidth;
      const altura = painel.offsetHeight;
      const cabeDireita = ponto.x + distancia + largura <= area.width - margem;
      const lado = cabeDireita ? 'direita' : 'esquerda';

      let left = lado === 'direita' ? ponto.x + distancia : ponto.x - distancia - largura;
      let top = ponto.y - Math.min(altura * 0.22, 90);

      left = Math.max(margem, Math.min(left, area.width - largura - margem));
      top = Math.max(margem, Math.min(top, area.height - altura - margem));

      painel.style.left = `${left}px`;
      painel.style.top = `${top}px`;
      painel.style.right = 'auto';
      painel.style.bottom = 'auto';
      painel.classList.add(lado === 'direita' ? 'painel-direita' : 'painel-esquerda');
    }

    function mostrar(predio, evento, svg) {
      if (!predio) { fecharPainel(); return; }
      const info = DESCRICOES_UNIDADES[predio.id] || {};
      const quadra = predio.quadra || info.quadra || '';
      categoria.textContent = NOMES_QUADRA[quadra] || (quadra ? 'Quadra ' + quadra : 'Campus UNIPÊ');
      titulo.textContent = info.titulo || predio.nome || 'Unidade do campus';
      descricao.textContent = predio.descricao || info.descricao || 'Informações deste local em atualização.';
      preencherLista(lista, predio, info);
      posicionarPainel(predio, evento, svg);
    }

    fechar.addEventListener('click', fecharPainel);
    window.addEventListener('resize', fecharPainel);
    return { mostrar, fechar: fecharPainel };
  }

  global.CampusDescriptions = {
    inicializar: inicializarCampusDescricoes,
    dados: DESCRICOES_UNIDADES
  };
})(window);
