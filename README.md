## 📋 Sobre o Projeto

Somos uma plataforma que visa incentivar e ajudar pessoas com dificuldades de exibir sua criatividade, e entusiastas do tema, a ingressarem neste mundo da arte e escrita.

Desenvolvemos um local seguro e dinâmico onde jovens e novos escritores/artistas que desejam ingressar no mundo da escrita e das artes visuais possam colaborar entre si. Através do compartilhamento de suas obras autorais e originais (histórias, contos, quadrinhos, mangás), os membros oferecem e recebem feedbacks técnicos e construtivos, gerando crescimento mútuo.

A plataforma também atua como ponte, viabilizando a co-autoração e a divisão de papéis (como a união entre um roteirista e um ilustrador) para tirar grandes ideias do papel.

### 🎯 Missão

Capacitar a nova geração de talentos independentes da literatura e das artes visuais, fornecendo as ferramentas técnicas e o ambiente colaborativo necessários para que desenvolvam suas habilidades, estruturem seus portfólios e se consolidem como profissionais preparados para o mercado da economia criativa.

---

## ✨ Funcionalidades

### 🔐 Autenticação

- Login e registro de usuários com autenticação segura (PBKDF2)
- Sessão persistente via `localStorage`
- Integração com Google Sign-In
- Recuperação de senha

### 👤 Perfis

- Perfil completo do usuário com avatar, bio e informações pessoais
- Gerenciamento de conta (editar, excluir)
- Histórico de criações e interações

### 🌐 Comunidades

- Explore comunidades em alta: Criativos, Fanarts, Mangá Club e mais
- Grupos temáticos para discussão e feedback
- Comentários construtivos em posts

### 🖼️ Galeria

- Explore arte conceitual e obras visuais
- Visualização em lightbox
- Estatísticas de views, likes e comentários

### 📚 Tópicos

Explore conteúdos por categorias:

- **Arte Criativa** - Ilustrações e designs
- **Escrita** - Histórias e contos literários
- **Criatividade** - Ideias e inspirações
- **Mangá** - Quadrinhos estilo japonês
- **Art Style** - Estilos artísticos diversos
- **Fantasy** - Conteúdo de fantasia
- **Geek** - Cultura geek e pop culture
- **Roteiro** - Roteiros para filmes, séries e jogos

### 📝 Postagens

- Compartilhamento de obras originais
- Contador de views, likes e comentários
- Sistema de avatar e identificação do autor

### 🎨 Interface

- Tema claro/escuro (toggle)
- Design responsivo mobile-first
- Acessibilidade com integração vLibras (sinalização em Libras)
- Barra de pesquisa por gêneros, títulos e autores

---

## 🏗️ Estrutura do Projeto

```
Contadores-de-Hist-rias/
├── assets/                          # Assets estáticos (SVG, imagens)
│   ├── img/                         # Imagens de comunidades e posts
│   ├── Logo-principal.svg           # Logo principal
│   └── *.svg                        # Ícones e logos variados
├── css/                             # Estilos CSS
│   ├── global.css                   # Reset e estilos globais
│   ├── variables.css                # Variáveis CSS (temas)
│   ├── index.css                    # Estilos da home page
│   ├── perfil.css                   # Estilos do perfil
│   ├── galeria.css                  # Estilos da galeria
│   ├── comunidade.css               # Estilos das comunidades
│   ├── historia.css                 # Estilos de histórias
│   ├── login.css                    # Estilos de login/signup
│   ├── forgotPassword.css           # Estilos de recuperação de senha
│   ├── header.css                   # Estilos do cabeçalho
│   ├── topicos.css                  # Estilos dos tópicos
│   └── *.css                        # Outros estilos específicos
├── js/                              # JavaScript
│   ├── auth.js                      # Autenticação e gerenciamento de usuários
│   ├── script.js                    # Script principal (index)
│   ├── header.js                    # Componente de header
│   ├── perfil.js                    # Lógica do perfil
│   ├── galeria.js                   # Lógica da galeria
│   ├── comunidade.js                # Lógica das comunidades
│   ├── historia.js                  # Lógica de histórias
│   ├── modalPosts.js                # Modais de posts
│   ├── comentariosComunidade.js     # Sistema de comentários
│   ├── allProfiles.js               # Lista de todos os perfis
│   ├── forgot-password.js           # Recuperação de senha
│   ├── form-validation.js           # Validação de formulários
│   ├── gallery.js                   # Galeria de imagens
│   ├── lightbox.js                  # Lightbox para imagens
│   ├── imageStore.js                # Armazenamento de imagens
│   ├── termsPopup.js                # Popup de termos
│   └── vlibras.js                   # Integração vLibras (acessibilidade)
├── pages/                           # Páginas HTML
│   ├── index.html                   # Página principal (Home)
│   ├── login.html                   # Login
│   ├── signUp.html                  # Cadastrar conta
│   ├── forgotPassword.html          # Recuperar senha
│   ├── perfil.html                  # Perfil do usuário
│   ├── galeria.html                 # Galeria de arte
│   ├── comunidade.html              # Lista de comunidades
│   ├── comentariosComunidade.html   # Detalhes da comunidade
│   ├── historia.html                # Visualização de história
│   ├── sobre.html                   # Sobre o projeto
│   ├── topicos.html                 # Página de tópicos
│   ├── allProfiles.html             # Todos os perfis
│   ├── destaques.html               # Destaques
│   ├── faqTermsPolitic.html         # FAQ, Termos e Política
│   └── pageTopico*.html             # Páginas individuais de tópicos
├── .gitignore                       # Git ignore
└── README.md                        # Este arquivo
```

---

## 🚀 Como Usar

### 1. Abrir o Projeto

Como o projeto é puramente frontend (HTML + CSS + JS), basta abrir o `index.html` em um navegador:

```bash
# No Windows, abra com:
start index.html

# Ou simplesmente clique duas vezes no arquivo index.html
```

> **Nota:** Para melhor experiência, recomenda-se usar um servidor local simples como o [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) do VS Code.

### 2. Criar uma Conta

1. Clique em **"Criar conta"** na página inicial
2. Preencha seus dados no formulário de cadastro
3. Você será redirecionado para a home page

### 3. Explorar Conteúdos

- **Para Você** - Posts recomendados na home page
- **Descobrir** - Explore tópicos por categoria
- **Galeria** - Arte conceitual e criações visuais
- **Comunidades** - Grupos temáticos para discussão

### 4. Compartilhar suas Obras

1. Faça login ou crie uma conta
2. Acesse seu perfil clicando em **"Comece a criar"**
3. Compartilhe suas histórias, ilustrações ou outros trabalhos criativos

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia     | Versão | Descrição                                              |
| -------------- | ------ | ------------------------------------------------------ |
| HTML5          | Latest | Estrutura semântica da aplicação                       |
| CSS3           | Latest | Estilos com variáveis customizadas e tema claro/escuro |
| JavaScript     | ES6+   | Lógica vanilla, classes, módulos                       |
| Web Components | -      | Componentes reutilizáveis (`meu-header`)               |
| localStorage   | -      | Persistência de dados local (sessões, usuários)        |

---

## 🎨 Design System

### Cores Principais

- **Cor Primária:** `#532822` (Tema claro) / `#f8e8e1` (Tema escuro)
- **Superfície 1:** `#f2e4ca` (Tema claro) / `#272121` (Tema escuro)
- **Fundo Principal:** `#f9f0ea` (Tema claro) / `#141010` (Tema escuro)

### Tipografia

O projeto utiliza fontes do sistema para melhor performance e compatibilidade.

---

## ♿ Acessibilidade

- **vLibras** - Integração com widget de tradução para Libras
- **Contraste adequado** - Segue diretrizes WCAG 2.2
- **Semântica HTML** - Uso correto de tags semânticas
- **Alt text** - Todas as imagens possuem descrições alternativas

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas alterações (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é destinado para fins educacionais e de colaboração criativa.

---
