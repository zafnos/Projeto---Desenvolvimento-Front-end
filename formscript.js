let card = document.querySelector('.card'); /* let card - seleciona o elemento com a classe 'card' do HTML */
let btnLogin = document.querySelector('.btn-login'); /* let btnLogin - seleciona o elemento com a classe 'btn-login' do HTML */
let btnCadastro = document.querySelector('.btn-cadastro'); /* let btnCadastro - seleciona o elemento com a classe 'btn-cadastro' do HTML */

btnLogin.onclick = () => { /* btnLogin.onclick - adiciona um evento de clique ao botão de login */
    card.classList.remove('CadastroActive');
    card.classList.add('LoginActive');
}

btnCadastro.onclick = () => {
    card.classList.remove('LoginActive');
    card.classList.add('CadastroActive');
}

const formLogin = document.getElementById('FormLogin');

// Mensagem personalizada nos campos obrigatórios
formLogin.querySelectorAll('input[required]').forEach((campo) => {
    const nome = campo.placeholder.toLowerCase(); // "E-mail" → "e-mail", "Senha" → "senha"

    campo.addEventListener('invalid', () => {
        if (campo.validity.valueMissing) {
            campo.setCustomValidity(`Por favor, preencha o campo ${nome}.`);
        } else if (campo.validity.typeMismatch) {
            campo.setCustomValidity(`Por favor, insira um ${nome} válido.`);
        }
    });

    // Limpa a mensagem ao digitar, senão o campo continua inválido
    campo.addEventListener('input', () => campo.setCustomValidity(''));
});

// Só dispara com tudo preenchido
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    window.location = 'index.html';
});

/*
document.getElementById('meuForm').addEventListener('submit', (e) => {
            e.preventDefault(); // Impede o envio do formulário antes de ser executado o código abaixo

            const nome = document.getElementById('nome').value;
            if (nome.trim() === '') {
                alert('Por favor, preencha o campo nome.');
            } else {
                window.location = 'obrigado.html';
            }
        });
*/

const formCadastro = document.getElementById('FormCadastro');

// Mensagem personalizada nos campos obrigatórios
formCadastro.querySelectorAll('input[required]').forEach((campo) => {
    const nome = campo.placeholder.toLowerCase(); // "E-mail" → "e-mail", "Senha" → "senha"

    campo.addEventListener('invalid', () => {
        if (campo.validity.valueMissing) {
            campo.setCustomValidity(`Por favor, preencha o campo ${nome}.`);
        } else if (campo.validity.typeMismatch) {
            campo.setCustomValidity(`Por favor, insira um ${nome} válido.`);
        }
    });

    // Limpa a mensagem ao digitar, senão o campo continua inválido
    campo.addEventListener('input', () => campo.setCustomValidity(''));
});
