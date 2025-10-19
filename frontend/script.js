const API_URL = "http://localhost:3000/api";

// ==================== VARIÁVEIS GLOBAIS ====================
let capituloEditando = null;

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
function verificarAutenticacao() {
    const token = localStorage.getItem('token');
    const paginasProtegidas = ['main.html', 'novela.html'];
    const paginaAtual = window.location.pathname.split('/').pop();
    
    if (paginasProtegidas.includes(paginaAtual) && !token) {
        window.location.href = "index.html";
        return false;
    }
    return true;
}

// ==================== NOVELAS ====================
async function carregarNovelas() {
    if (!verificarAutenticacao()) return;

    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_URL}/novelas`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erro ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const lista = document.getElementById('lista-novelas');
        if (!lista) return;
        
        lista.innerHTML = "";

        if (!data || data.length === 0) {
            lista.innerHTML = '<li style="color: #666; font-style: italic; padding: 10px;">Nenhuma novela criada ainda.</li>';
            return;
        }

        data.forEach(novela => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <strong>${novela.titulo || 'Sem título'}</strong>
                    ${novela.descricao ? `<br><small style="color: #666;">${novela.descricao}</small>` : ''}
                </div>
            `;
            
            li.addEventListener('mouseenter', () => {
                li.style.backgroundColor = '#f5f5f5';
            });
            li.addEventListener('mouseleave', () => {
                li.style.backgroundColor = 'transparent';
            });
            
            li.onclick = () => {
                localStorage.setItem('novelaId', novela.id);
                localStorage.setItem('tituloNovela', novela.titulo);
                window.location.href = "novela.html";
            };
            lista.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar novelas:', error);
        const lista = document.getElementById('lista-novelas');
        if (lista) {
            lista.innerHTML = '<li style="color: red; padding: 10px;">Erro ao carregar novelas: ' + error.message + '</li>';
        }
    }
}

async function criarNovela() {
    if (!verificarAutenticacao()) return;

    const token = localStorage.getItem('token');
    const tituloInput = document.getElementById('titulo');
    const descricaoInput = document.getElementById('descricao');
    
    if (!tituloInput || !descricaoInput) {
        alert('Campos de entrada não encontrados!');
        return;
    }
    
    const titulo = tituloInput.value.trim();
    const descricao = descricaoInput.value.trim();

    if (!titulo) {
        alert('Por favor, insira um título para a novela.');
        tituloInput.focus();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/novelas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                titulo: titulo,
                descricao: descricao 
            })
        });

        if (res.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            logout();
            return;
        }

        const responseData = await res.json();
        
        if (res.ok) {
            tituloInput.value = '';
            descricaoInput.value = '';
            await carregarNovelas();
            alert('Novela criada com sucesso!');
        } else {
            throw new Error(responseData.message || `Erro ${res.status} ao criar novela`);
        }
    } catch (error) {
        console.error('Erro ao criar novela:', error);
        alert('Erro ao criar novela: ' + error.message);
    }
}

// ==================== CAPÍTULOS ====================
async function carregarCapitulos() {
    if (!verificarAutenticacao()) return;

    const token = localStorage.getItem('token');
    const novelaId = localStorage.getItem('novelaId');
    const tituloNovela = localStorage.getItem('tituloNovela');
    
    if (!token || !novelaId) {
        window.location.href = "main.html";
        return;
    }

    const tituloElement = document.getElementById('titulo-novela');
    if (tituloElement && tituloNovela) {
        tituloElement.textContent = tituloNovela;
    }

    try {
        const res = await fetch(`${API_URL}/novelas/${novelaId}/capitulos`, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (!res.ok) {
            throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const container = document.getElementById('lista-capitulos');
        
        if (!container) {
            console.error('Elemento lista-capitulos não encontrado');
            return;
        }
        
        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="card">Nenhum capítulo criado ainda.</div>';
            return;
        }

        data.forEach(capitulo => {
            const div = document.createElement('div');
            div.classList.add('card', 'capitulo-card');
            div.innerHTML = `
                <div class="capitulo-header">
                    <h3>${capitulo.titulo || 'Sem título'}</h3>
                    <div class="capitulo-actions">
                        <button class="btn-edit" onclick="editarCapitulo(${capitulo.id}, '${escaparAspas(capitulo.titulo)}', '${escaparAspas(capitulo.conteudo)}')">Editar</button>
                        <button class="btn-delete" onclick="excluirCapitulo(${capitulo.id})">Excluir</button>
                    </div>
                </div>
                <div class="conteudo-capitulo">${formatarConteudo(capitulo.conteudo)}</div>
                <small>Criado em: ${new Date(capitulo.created_at || Date.now()).toLocaleDateString()}</small>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar capítulos:', error);
        const container = document.getElementById('lista-capitulos');
        if (container) {
            container.innerHTML = '<div class="card" style="color: red;">Erro ao carregar capítulos: ' + error.message + '</div>';
        }
    }
}

async function criarCapitulo() {
    if (!verificarAutenticacao()) return;

    const token = localStorage.getItem('token');
    const novelaId = localStorage.getItem('novelaId');
    const tituloInput = document.getElementById('titulo-cap');
    const conteudoInput = document.getElementById('conteudo-cap');
    
    if (!tituloInput || !conteudoInput) {
        alert('Campos de capítulo não encontrados!');
        return;
    }
    
    const titulo = tituloInput.value.trim();
    const conteudo = conteudoInput.value.trim();

    if (!titulo || !conteudo) {
        alert('Por favor, preencha título e conteúdo do capítulo.');
        return;
    }

    try {
        let url = `${API_URL}/novelas/${novelaId}/capitulos`;
        let method = 'POST';

        // Se está editando, muda para PUT
        if (capituloEditando) {
            url += `/${capituloEditando}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                titulo: titulo, 
                conteudo: conteudo 
            })
        });

        if (res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();
        
        if (res.ok) {
            // Limpa os campos e reseta o estado de edição
            tituloInput.value = '';
            conteudoInput.value = '';
            capituloEditando = null;
            
            // Atualiza o texto do botão
            const btnSalvar = document.querySelector('button[onclick="criarCapitulo()"]');
            if (btnSalvar) {
                btnSalvar.textContent = 'Salvar Capítulo';
            }
            
            // Recarrega os capítulos
            await carregarCapitulos();
            
            // Feedback visual
            alert(capituloEditando ? 'Capítulo atualizado com sucesso!' : 'Capítulo criado com sucesso!');
        } else {
            throw new Error(data.message || 'Erro ao salvar capítulo');
        }
    } catch (error) {
        console.error('Erro ao salvar capítulo:', error);
        alert('Erro ao salvar capítulo: ' + error.message);
    }
}

async function editarCapitulo(id, titulo, conteudo) {
    // Preenche o formulário com os dados do capítulo
    const tituloInput = document.getElementById('titulo-cap');
    const conteudoInput = document.getElementById('conteudo-cap');
    const btnSalvar = document.querySelector('button[onclick="criarCapitulo()"]');
    
    if (tituloInput && conteudoInput && btnSalvar) {
        tituloInput.value = titulo;
        conteudoInput.value = conteudo;
        capituloEditando = id;
        btnSalvar.textContent = 'Atualizar Capítulo';
        
        // Rola até o formulário
        tituloInput.scrollIntoView({ behavior: 'smooth' });
        tituloInput.focus();
    }
}

async function excluirCapitulo(id) {
    if (!confirm('Tem certeza que deseja excluir este capítulo?')) {
        return;
    }

    const token = localStorage.getItem('token');
    const novelaId = localStorage.getItem('novelaId');

    try {
        const res = await fetch(`${API_URL}/novelas/${novelaId}/capitulos/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            logout();
            return;
        }

        if (res.ok) {
            await carregarCapitulos();
            alert('Capítulo excluído com sucesso!');
        } else {
            const data = await res.json();
            throw new Error(data.message || 'Erro ao excluir capítulo');
        }
    } catch (error) {
        console.error('Erro ao excluir capítulo:', error);
        alert('Erro ao excluir capítulo: ' + error.message);
    }
}

function cancelarEdicao() {
    const tituloInput = document.getElementById('titulo-cap');
    const conteudoInput = document.getElementById('conteudo-cap');
    const btnSalvar = document.querySelector('button[onclick="criarCapitulo()"]');
    
    if (tituloInput && conteudoInput && btnSalvar) {
        tituloInput.value = '';
        conteudoInput.value = '';
        capituloEditando = null;
        btnSalvar.textContent = 'Salvar Capítulo';
    }
}

// ==================== AUTENTICAÇÃO ====================
async function login() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const msg = document.getElementById('msg');

    if (!email || !senha) {
        if (msg) msg.textContent = 'Por favor, preencha todos os campos.';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: email, 
                password: senha 
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = "main.html";
        } else {
            if (msg) msg.textContent = data.message || "Erro ao fazer login.";
        }
    } catch (error) {
        console.error('Erro no login:', error);
        if (msg) msg.textContent = "Erro de conexão com o servidor.";
    }
}

async function register() {
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const msg = document.getElementById('msg');

    if (!nome || !email || !senha) {
        if (msg) msg.textContent = 'Por favor, preencha todos os campos.';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/cadastrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                nome: nome, 
                email: email, 
                senha: senha 
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            if (msg) {
                msg.style.color = "green";
                msg.textContent = data.message || "Conta criada com sucesso! Faça login.";
            }
            
            document.getElementById('nome').value = '';
            document.getElementById('email').value = '';
            document.getElementById('senha').value = '';
        } else {
            if (msg) {
                msg.style.color = "red";
                msg.textContent = data.message || "Erro ao criar conta.";
            }
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        if (msg) msg.textContent = "Erro de conexão com o servidor.";
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('novelaId');
    localStorage.removeItem('tituloNovela');
    window.location.href = "index.html";
}

function voltar() {
    window.location.href = "main.html";
}

function formatarConteudo(texto) {
    if (!texto) return '';
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function escaparAspas(texto) {
    if (!texto) return '';
    return texto.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
    // Para o formulário de criação de novela
    const tituloInput = document.getElementById('titulo');
    const descricaoInput = document.getElementById('descricao');
    
    if (tituloInput) {
        tituloInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                criarNovela();
            }
        });
    }
    
    if (descricaoInput) {
        descricaoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                criarNovela();
            }
        });
    }
    
    // Para o formulário de criação/edição de capítulo
    const tituloCapInput = document.getElementById('titulo-cap');
    const conteudoCapInput = document.getElementById('conteudo-cap');
    
    if (tituloCapInput) {
        tituloCapInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                criarCapitulo();
            }
        });
    }

    // Verifica autenticação quando a página carrega
    verificarAutenticacao();
});