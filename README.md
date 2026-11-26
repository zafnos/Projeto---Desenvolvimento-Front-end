# Localiza Unipê

O Localiza Unipê é uma aplicação web com um mapa interativo do campus do Centro Universitário de João Pessoa. Seu objetivo é ajudar estudantes e visitantes a encontrar blocos, setores, serviços e outros locais do campus.

## Funcionalidades e partes da página

- **Cabeçalho:** apresenta a identidade do projeto, a busca e o botão **Sobre**, que abre informações sobre o projeto e sua equipe.
- **Busca:** permite pesquisar prédios, blocos, cursos, serviços e pontos do campus. Ao selecionar um resultado, o mapa é direcionado para o local correspondente.
- **Mapa interativo:** apresenta o campus em uma ilustração SVG. É possível arrastar, ampliar e selecionar prédios para consultar informações.
- **Menu Locais:** lista os prédios do campus e permite filtrá-los por categoria.
- **Controles do mapa:** permitem ajustar o zoom, restaurar a visualização e mostrar ou ocultar as cores das quadras e as siglas dos prédios.
- **Painel de informações:** exibe detalhes do prédio selecionado, como descrição, setores, cursos e horários quando disponíveis, além de um link para o Google Maps.
- **Adaptação para telas menores:** o cabeçalho, os controles e o painel de informações possuem regras de estilo para dispositivos móveis.

## Tecnologias utilizadas

| Tecnologia | Uso no projeto |
| --- | --- |
| HTML5 | Estrutura da página, campos de busca, botões, painéis e janela de informações. |
| CSS3 | Cores, fontes, disposição dos elementos e adaptação a diferentes tamanhos de tela. |
| JavaScript | Interação com o mapa, busca, filtros, controles e exibição das informações. |
| SVG | Desenho do mapa e de elementos gráficos interativos no navegador. |
| JSON | Formato de dados utilizado no arquivo auxiliar `predios.json`. |
| Git e GitHub | Controle de versão e armazenamento do código do projeto. |

A fonte **Public Sans** é carregada pelo Google Fonts. O link de localização dos prédios utiliza o Google Maps.

## Organização dos arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura principal da página. |
| `style.css` | Estilos e regras responsivas. |
| `app.js` | Inicialização da página e interação dos controles, busca e lista de locais. |
| `campus-data.js` | Dados e geometria utilizados para desenhar o campus. |
| `campus-map.js` | Desenho do mapa SVG e funções de interação e navegação. |
| `campus-descricoes.js` | Informações dos locais e funcionamento do painel de detalhes. |
| `predios.json` | Arquivo auxiliar com dados dos prédios. |
| `logo-localiza.png` | Imagem da marca exibida no cabeçalho. |

## Quantidade de linhas e participação por tecnologia

Na contagem realizada em **26 de novembro de 2026**, os seis arquivos HTML, CSS e JavaScript carregados pela página somam **1.910 linhas físicas**, incluindo linhas em branco, comentários e dados. A participação abaixo representa a proporção dessas linhas por linguagem; ela não mede complexidade, esforço ou uso de recursos.

| Tecnologia | Arquivos contabilizados | Linhas | Participação |
| --- | --- | ---: | ---: |
| HTML | `index.html` | 123 | 6,44% |
| CSS | `style.css` | 305 | 15,97% |
| JavaScript | `app.js`, `campus-data.js`, `campus-map.js` e `campus-descricoes.js` | 1.482 | 77,59% |
| **Total** | | **1.910** | **100%** |

O arquivo auxiliar `predios.json` possui **145 linhas** e não está incluído na tabela, pois não é carregado diretamente pela página. Incluindo-o, os arquivos de código e dados listados acima somam **2.055 linhas**. Documentação, imagem e configurações do editor não foram incluídas. O arquivo `campus-data.js` concentra muitos dados em apenas duas linhas, portanto a contagem de linhas não representa o tamanho dos arquivos. Esses valores podem mudar conforme o projeto evoluir.

## Como executar

Abra o arquivo `index.html` em um navegador moderno. No VS Code, também é possível usar **Executar e Depurar** e selecionar a configuração **Abrir Localiza Unipê no Chrome**.

O projeto pode ser publicado como site estático: os arquivos HTML, CSS, JavaScript e a imagem devem permanecer acessíveis na mesma estrutura de pastas.

## Equipe

- Marcelo Felix Araujo
- Afonso Michel Silva Pereira
- Júlio César Dos Anjos
- Naassom Do Nascimento Melo
- Cirilo Leandro Venancio
