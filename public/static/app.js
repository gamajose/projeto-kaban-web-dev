// public/static/app.js

class HomePageApp {
  constructor() {
    authService.protectPage(); 

    this.currentUser = authService.getUser();
    this.recentItems = [];
    this.assignedTasks = [];
    this.init();
  }

  initInteractivity() {
    const grid = document.getElementById("widgets-grid");
    if (grid) {
      new Sortable(grid, {
        animation: 150, // Animação suave ao arrastar
        handle: "h2", // Permite arrastar apenas pelo título do widget
        ghostClass: "bg-blue-200", // Classe CSS para o "fantasma" do item a ser movido
        onEnd: (evt) => {
          // Aqui podemos guardar a nova ordem dos widgets no futuro
          console.log(
            "Ordem dos widgets alterada:",
            evt.newIndex,
            evt.oldIndex
          );
        },
      });
    }
  }

  initComponents() {
    new MyTasksWidget(document.querySelector('[data-widget-id="meu-trabalho"]'), this.currentUser.id);
    new RecentWidget(document.querySelector('[data-widget-id="recentes"]'), this.currentUser.id);
    new AgendaWidget(document.querySelector('[data-widget-id="agenda"]'), this.currentUser.id);

    // Inicia o novo widget
    const myWorkContainer = document.querySelector('[data-widget-id="meu-trabalho"]');
    if (myWorkContainer) new MyWorkWidget(myWorkContainer, this.currentUser.id);

    const recentContainer = document.querySelector('[data-widget-id="recentes"]');
    if (recentContainer) new RecentWidget(recentContainer, this.currentUser.id);

    const agendaContainer = document.querySelector('[data-widget-id="agenda"]');
    if (agendaContainer) new AgendaWidget(agendaContainer, this.currentUser.id);
  }

  async init() {

    try {
      const usersResponse = await axios.get("/api/users");
      this.currentUser =
        usersResponse.data.users.find(
          (u) => u.email === "admin@clickupclone.com"
        ) || usersResponse.data.users[0];

      if (!this.currentUser) {
        window.location.href = '/login'; // Proteção de página
        return;
      }

      this.render();

      this.initComponents();
      this.initInteractivity();


      const loading = document.getElementById("loading");
      if (loading) {
        loading.style.opacity = "0";
        setTimeout(() => loading.remove(), 300);
      }
    } catch (error) {
      console.error("Falha ao inicializar a página:", error);
      document.body.innerHTML =
        '<p style="color: white; text-align: center; margin-top: 50px;">Erro ao carregar a aplicação. Verifique a consola do navegador para mais detalhes.</p>';
    }
  }

  // 4. Nova função para gerir todos os widgets
  initComponents() {
    const userId = this.currentUser.id;

    // Para cada widget, encontra o seu contentor e inicia o seu componente
    const myWorkEl = document.querySelector('[data-widget-id="meu-trabalho"]');
    if (myWorkEl) new MyWorkWidget(myWorkEl, userId);

    const recentEl = document.querySelector('[data-widget-id="recentes"]');
    if (recentEl) new RecentWidget(recentEl, userId);
    
    const assignedEl = document.querySelector('[data-widget-id="atribuidas-a-mim"]');
    if (assignedEl) new AssignedToMeWidget(assignedEl, userId);

    const agendaEl = document.querySelector('[data-widget-id="agenda"]');
    if (agendaEl) new AgendaWidget(agendaEl, userId);
  }

  render() {
    const app = document.getElementById("app");
    if (!app) return;

    // Nova estrutura principal com cabeçalho de largura total
    app.innerHTML = `
            <div class="app-container">
                ${this.renderTopBar()}
                <div class="app-body">
                    ${this.renderSidebar()}
                    ${this.renderMainContent()} 
                </div>
            </div>
        `;
  }

  renderRecentWidget() {
    return `
            <div class="lg:col-span-2 widget-card" data-widget-id="recentes">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-semibold text-white">Recentes</h2>
                    <button class="text-gray-400 hover:text-white"><i class="fas fa-ellipsis-h"></i></button>
                </div>
                <div class="widget-content">
                    <ul class="space-y-3">
                        ${
                          this.recentItems.length > 0
                            ? this.recentItems
                                .map(
                                  (item) => `
                            <li class="flex items-center text-sm cursor-pointer group">
                                <i class="fas fa-tasks text-gray-500 w-5 text-center mr-3"></i>
                                <span class="text-gray-200 group-hover:text-white group-hover:underline">${item.task_name}</span>
                                <span class="text-gray-600 mx-2">•</span>
                                <span class="text-gray-500">${item.space_name}</span>
                            </li>
                        `
                                )
                                .join("")
                            : '<p class="text-sm text-gray-500">Nenhuma atividade recente.</p>'
                        }
                    </ul>
                </div>
            </div>
        `;
  }

  renderAssignedToMeWidget() {
    return `
            <div class="lg:col-span-2 widget-card" data-widget-id="atribuidas-a-mim">
                 <div class="flex items-center justify-between mb-4">
                    <h2 class="font-semibold text-white">Atribuídas a mim</h2>
                    <button class="text-gray-400 hover:text-white"><i class="fas fa-ellipsis-h"></i></button>
                </div>
                <div class="widget-content">
                    <ul class="space-y-2">
                    ${
                      this.assignedTasks.length > 0
                        ? this.assignedTasks
                            .map(
                              (task) => `
                        <li class="flex items-center p-1.5 rounded hover:bg-[var(--bg-header)] cursor-pointer group">
                            <i class="far fa-circle text-purple-400 group-hover:text-purple-300 mr-3"></i>
                            <span class="text-gray-200 group-hover:text-white text-sm flex-grow">${
                              task.name
                            }</span>
                            ${
                              task.due_date
                                ? `<span class="text-xs text-green-400">${new Date(
                                    task.due_date
                                  ).toLocaleDateString("pt-BR")}</span>`
                                : ""
                            }
                        </li>
                    `
                            )
                            .join("")
                        : '<p class="text-sm text-gray-500">Nenhuma tarefa atribuída. Bom trabalho!</p>'
                    }
                    </ul>
                </div>
            </div>
        `;
  }

  renderTopBar() {
    // Este é o novo cabeçalho de largura total
    return `
            <header class="app-header-fullwidth">
                <div class="flex items-center flex-shrink-0">
                    <img src="/static/images/logo.png" alt="Logo" class="h-7 w-7">
                </div>
                
                <div class="header-search-centered">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"></i>
                        <input type="text" placeholder="Pesquisar" class="form-input w-full pl-9 pr-12 py-1.5 text-sm rounded-md">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">IA</span>
                    </div>
                </div>

                <div class="flex items-center space-x-3 flex-shrink-0">
                    <button class="btn btn-primary text-sm" style="background-color: #373a3f;">
                        <i class="fas fa-plus mr-2"></i>Novo
                    </button>
                    <div class="flex items-center space-x-1">
                        <button class="p-2 text-[var(--text-secondary)] hover:text-white"><i class="fas fa-stopwatch"></i></button>
                        <button class="p-2 text-[var(--text-secondary)] hover:text-white"><i class="fas fa-video"></i></button>
                        <img src="${
                          this.currentUser?.avatar_url ||
                          "/static/default-avatar.png"
                        }" class="avatar avatar-sm cursor-pointer rounded-full" />
                    </div>
                </div>
            </header>
        `;
  }

  renderSidebar() {
    // ESTA É A SUA BARRA LATERAL COMPLETA, COM TODOS OS LINKS E O ERRO DE SINTAXE CORRIGIDO
    return `
            <aside class="pro-sidebar">
                <div class="p-4 border-b border-[var(--border-color)]">
                    <img src="/static/images/logo.png" alt="Logo" class="h-8 w-8">
                </div>
                <nav class="flex-grow p-2 overflow-y-auto">
                    <a class="sidebar-link flex items-center p-2 rounded active">
                        <i class="fas fa-home w-6 text-center mr-2"></i>
                        <span>Início</span>
                    </a>
                    <a class="sidebar-link flex items-center p-2 rounded relative">
                        <i class="fas fa-inbox w-6 text-center mr-2"></i>
                        <span>Caixa de entrada</span>
                        
                    </a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-comment w-6 text-center mr-2"></i><span>Chat</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-file-alt w-6 text-center mr-2"></i><span>Documentos</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-chalkboard w-6 text-center mr-2"></i><span>Painéis</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-border-all w-6 text-center mr-2"></i><span>Quadros brancos</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-clipboard-list w-6 text-center mr-2"></i><span>Formulários</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-bullseye w-6 text-center mr-2"></i><span>Metas</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-clock w-6 text-center mr-2"></i><span>Planilhas de horas</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-ellipsis-h w-6 text-center mr-2"></i><span>Mais</span></a>

                    <div class="text-xs font-bold uppercase text-gray-500 px-2 mt-4 mb-2">Favoritos</div>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-star w-6 text-center mr-2 text-yellow-500"></i><span>Tudo</span></a>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-star w-6 text-center mr-2 text-yellow-500"></i><span>Equipe da equipe</span></a>
                    
                    <div class="text-xs font-bold uppercase text-gray-500 px-2 mt-4 mb-2">Espaços</div>
                    <a class="sidebar-link flex items-center p-2 rounded"><i class="fas fa-folder w-6 text-center mr-2 text-blue-400"></i><span>Customer Centric</span></a>
                </nav>
            </aside>
        `;
  }

  renderSubHeader() {
    return `
            <section class="pro-subheader">
                <div class="flex items-center space-x-4">
                     <button class="flex items-center space-x-2">
                        <div class="w-5 h-5 bg-teal-500 rounded flex items-center justify-center text-white font-bold text-xs">R</div>
                        <span class="font-semibold text-sm text-white">Red Inovattion</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400"></i>
                    </button>
                    <div class="flex items-center space-x-2 text-gray-300 text-sm">
                        <i class="fas fa-home"></i>
                        <span>Início</span>
                    </div>
                </div>
                <div>
                    <button class="btn btn-primary text-sm" style="background-color: var(--accent-color);">Gerenciar cartões</button>
                </div>
            </section>
        `;
  }

  renderMainContent() {
    const userName = this.currentUser
      ? this.currentUser.name.split(" ")[0]
      : "Admin";
    return `
            <main class="app-content-area">
                <h1 class="text-3xl font-bold mb-6 text-white">Boa noite, ${userName}</h1>
                <div id="widgets-grid" class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    <div class="lg:col-span-2 widget-card" data-widget-id="recentes"><h2 class="font-semibold text-white">Recentes</h2><p class="text-sm text-gray-500 mt-4">Em breve...</p></div>
                    <div class="lg:col-span-2 widget-card" data-widget-id="agenda"><h2 class="font-semibold text-white">Agenda</h2><p class="text-sm text-gray-500 mt-4">Em breve...</p></div>
                    
                    <div class="lg:col-span-4 widget-card" data-widget-id="meu-trabalho">
                        <p class="text-sm text-gray-500">A carregar o seu trabalho...</p>
                    </div>

                    <div class="lg:col-span-4 widget-card" data-widget-id="atribuidas-a-mim"><h2 class="font-semibold text-white">Atribuídas a mim</h2><p class="text-sm text-gray-500 mt-4">Em breve...</p></div>
                    
                    <div class="lg:col-span-1 widget-card text-center flex flex-col items-center justify-center p-6" data-widget-id="lista-pessoal">
                        <i class="fas fa-tasks text-3xl text-gray-500 mb-3"></i>
                        <h2 class="font-semibold text-white mb-2">Lista pessoal</h2>
                        <p class="text-xs text-gray-500 mb-4">A lista pessoal contém todas as suas tarefas.</p>
                        <button class="btn btn-primary text-xs w-full" style="background-color: var(--accent-color);">+ Criar uma tarefa</button>
                    </div>
                    <div class="lg:col-span-1 widget-card text-center flex flex-col items-center justify-center p-6" data-widget-id="comentarios">
                        <i class="fas fa-comments text-3xl text-gray-500 mb-3"></i>
                        <h2 class="font-semibold text-white mb-2">Comentários atribuídos</h2>
                        <p class="text-xs text-gray-500 mb-4">Você não tem comentários atribuídos.</p>
                    </div>
                    <div class="lg:col-span-1 widget-card text-center flex flex-col items-center justify-center p-6" data-widget-id="prioridades">
                        <i class="fas fa-flag text-3xl text-gray-500 mb-3"></i>
                        <h2 class="font-semibold text-white mb-2">Prioridades</h2>
                        <p class="text-xs text-gray-500 mb-4">As Prioridades mantêm as tarefas mais importantes.</p>
                        <button class="btn btn-primary text-xs w-full" style="background-color: var(--accent-color);">+ Criar uma tarefa</button>
                    </div>
                    <div class="lg:col-span-1 widget-card text-center flex flex-col items-center justify-center p-6" data-widget-id="standup-ia">
                        <i class="fas fa-robot text-3xl text-gray-500 mb-3"></i>
                        <h2 class="font-semibold text-white mb-2">StandUp da IA</h2>
                        <p class="text-xs text-gray-500 mb-4">Use a IA ClickUp para criar resumos.</p>
                        <button class="btn btn-primary text-xs w-full" style="background-color: var(--accent-color);">Criar uma recapitulação</button>
                    </div>
                </div>
            </main>
        `;
  }

  renderRecentWidget() {
    return `
            <div class="widget-card bg-[var(--bg-secondary)] border-[var(--border-color)] rounded-lg p-6">
                <h2 class="font-semibold mb-4 text-white">Recentes</h2>
                <ul class="space-y-3">
                    ${this.recentItems
                      .map(
                        (item) => `
                        <li class="flex items-center text-sm">
                            <i class="fas fa-tasks text-[var(--text-secondary)] w-5 text-center mr-3"></i>
                            <span class="text-white hover:underline cursor-pointer">${item.task_name}</span>
                            <span class="text-[var(--text-secondary)] mx-2">•</span>
                            <span class="text-[var(--text-secondary)]">${item.space_name}</span>
                        </li>
                    `
                      )
                      .join("")}
                </ul>
            </div>
        `;
  }

  renderAssignedToMeWidget() {
    return `
                <div class="widget-card bg-[var(--bg-secondary)] border-[var(--border-color)] rounded-lg p-6">
                    <h2 class="font-semibold mb-4 text-white">Atribuídas a mim</h2>
                    <ul class="space-y-2">
                    ${this.assignedTasks
                      .map(
                        (task) => `
                        <li class="flex items-center p-1.5 rounded hover:bg-gray-700 cursor-pointer">
                            <i class="fas fa-check-circle text-purple-400 mr-3"></i>
                            <span class="text-white text-sm flex-grow">${
                              task.name
                            }</span>
                            ${
                              task.due_date
                                ? `<span class="text-xs text-green-400">${new Date(
                                    task.due_date
                                  ).toLocaleDateString()}</span>`
                                : ""
                            }
                        </li>
                    `
                      )
                      .join("")}
                    </ul>
                </div>
            `;
  }

  // Métodos placeholder para os outros widgets que faremos a seguir
  renderMyWorkWidget() {
    return `
                <div class="widget-card bg-[var(--bg-secondary)] border-[var(--border-color)] rounded-lg p-6">
                    <h2 class="font-semibold mb-4 text-white">Meu trabalho</h2>
                    <p class="text-[var(--text-secondary)]">Em breve...</p>
                </div>
            `;
  }

  renderAgendaWidget() {
    return `
                <div class="widget-card bg-[var(--bg-secondary)] border-[var(--border-color)] rounded-lg p-6">
                    <h2 class="font-semibold mb-4 text-white">Agenda</h2>
                    <p class="text-[var(--text-secondary)]">Em breve...</p>
                </div>
            `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new HomePageApp();
});
