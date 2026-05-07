import './styles.css'
import Chart from 'chart.js/auto'
import { apiDelete, apiGet, apiPost, apiPut, buildAssetUrl } from './services/api.js'

const app = document.querySelector('#app')

const state = {
  activePage: 'dashboard',
  data: {
    dashboard: null,
    vehicles: [],
    drivers: [],
    checklists: [],
    maintenances: [],
    users: [],
  },
  ui: {
    loading: false,
    checklistFilters: {
      search: '',
      status: '',
      vehicleId: '',
      driverId: '',
      dateFrom: '',
      dateTo: '',
    },
  },
}

const checklistStatusOptions = ['OK', 'PENDENTE', 'PROBLEMA']
const vehicleStatusOptions = ['ATIVO', 'MANUTENCAO', 'INATIVO']
const driverStatusOptions = ['ATIVO', 'INATIVO']
const maintenanceStatusOptions = ['ABERTA', 'AGENDADA', 'CONCLUIDA']
const userRoleOptions = ['ADMIN', 'OPERADOR']
const dashboardCharts = {}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('pt-BR')
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (['ativo', 'ok', 'concluida', 'admin'].includes(normalized)) return 'badge success'
  if (['problema', 'manutencao', 'aberta'].includes(normalized)) return 'badge danger'
  if (['pendente', 'agendada', 'inativo', 'operador'].includes(normalized)) return 'badge warning'
  return 'badge'
}

function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function formatChecklistNumber(checklist) {
  const value = Number(checklist?.number || 0)
  if (value > 0) return `CHK-${String(value).padStart(6, '0')}`

  const created = checklist?.createdAt ? new Date(checklist.createdAt).getTime() : 0
  const ordered = [...state.data.checklists].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const index = ordered.findIndex((item) => item.id === checklist?.id)
  if (index >= 0) return `CHK-${String(index + 1).padStart(6, '0')}`

  return created ? `CHK-${String(Math.abs(created).toString().slice(-6)).padStart(6, '0')}` : 'CHK-000000'
}

function getDriverPhotoUrl(checklist) {
  return checklist?.driverPhoto ? buildAssetUrl(checklist.driverPhoto) : ''
}

function renderDriverAvatar(checklist, size = 'normal') {
  const url = getDriverPhotoUrl(checklist)
  const initials = String(checklist?.driver?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  if (url) {
    return `<img class="driver-avatar ${size}" src="${url}" alt="Foto de ${escapeHtml(checklist?.driver?.name || 'funcionário')}" />`
  }

  return `<div class="driver-avatar ${size} empty"><span>${escapeHtml(initials || '?')}</span></div>`
}

function formatKm(value) {
  if (value == null || value === '') return '-'
  return `${Number(value).toLocaleString('pt-BR')} km`
}

function getMaintenanceAlert(item) {
  const status = item.alertStatus || item.status
  if (status === 'VENCIDA') return { label: 'Manutenção vencida', className: 'badge danger' }
  if (status === 'PROXIMA') return { label: 'Próxima manutenção', className: 'badge warning' }
  if (status === 'CONCLUIDA') return { label: 'Concluída', className: 'badge success' }
  return { label: status || 'ABERTA', className: getStatusClass(status) }
}

function checklistItemStats(items = []) {
  return {
    total: items.length,
    ok: items.filter((item) => item.status === 'OK').length,
    pending: items.filter((item) => item.status === 'PENDENTE').length,
    problem: items.filter((item) => item.status === 'PROBLEMA').length,
    photos: items.filter((item) => !!item.photoUrl).length,
  }
}

function getChecklistCardClass(checklist) {
  if (checklist.status === 'PROBLEMA') return 'check-card problem'
  if (checklist.status === 'PENDENTE') return 'check-card pending'
  return 'check-card ok'
}

function getFilteredChecklists() {
  const filters = state.ui.checklistFilters
  return state.data.checklists.filter((item) => {
    const search = filters.search.trim().toLowerCase()
    const vehicleText = `${item.vehicle?.prefix || ''} ${item.vehicle?.plate || ''} ${item.vehicle?.model || ''}`.toLowerCase()
    const driverText = `${item.driver?.name || ''}`.toLowerCase()
    const locationText = `${item.location || ''}`.toLowerCase()
    const notesText = `${item.notes || ''}`.toLowerCase()
    const date = new Date(item.createdAt)

    const matchesSearch = !search || [vehicleText, driverText, locationText, notesText, item.type?.toLowerCase() || ''].some((value) => value.includes(search))
    const matchesStatus = !filters.status || item.status === filters.status
    const matchesVehicle = !filters.vehicleId || item.vehicleId === filters.vehicleId
    const matchesDriver = !filters.driverId || item.driverId === filters.driverId
    const matchesDateFrom = !filters.dateFrom || date >= new Date(`${filters.dateFrom}T00:00:00`)
    const matchesDateTo = !filters.dateTo || date <= new Date(`${filters.dateTo}T23:59:59`)

    return matchesSearch && matchesStatus && matchesVehicle && matchesDriver && matchesDateFrom && matchesDateTo
  })
}

async function loadAllData() {
  state.ui.loading = true
  renderApp()

  try {
    const [dashboard, vehicles, drivers, checklists, maintenances, users] = await Promise.all([
      apiGet('/dashboard'),
      apiGet('/vehicles'),
      apiGet('/drivers'),
      apiGet('/checklists'),
      apiGet('/maintenances'),
      apiGet('/users'),
    ])

    state.data = { dashboard, vehicles, drivers, checklists, maintenances, users }
  } catch (error) {
    alert(`Erro ao carregar dados: ${error.message}`)
  } finally {
    state.ui.loading = false
    renderApp()
  }
}

function renderSidebar() {
  const items = [
    ['dashboard', '📊', 'Dashboard'],
    ['vehicles', '🚛', 'Veículos'],
    ['drivers', '🧑‍✈️', 'Condutores'],
    ['checklists', '📝', 'Checklists'],
    ['maintenances', '🛠️', 'Manutenções'],
    ['users', '👥', 'Usuários'],
    ['about', '🏢', 'Sobre'],
  ]

  return `
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="brand-card premium-brand">
          <div class="brand-badge">Sitran Sinalização Industrial Ltda ES</div>

          <div class="brand-logo-wrap">
            <div class="brand-logo-glow"></div>

            <h1>
              SITRAN
              <span>ES</span>
            </h1>
          </div>

          <p>
            Painel operacional inteligente para controle de frota,
            checklists, manutenção e condutores.
          </p>
        </div>
      </div>

      <nav class="menu premium-menu">
        ${items.map(([key, icon, label]) => `
          <button
            class="menu-item premium-item ${state.activePage === key ? 'active' : ''}"
            data-page="${key}"
          >
            <div class="menu-icon">${icon}</div>

            <div class="menu-text">
              <strong>${label}</strong>
              <span>Módulo operacional</span>
            </div>

            <div class="menu-indicator"></div>
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-foot clean premium-foot">
        <div class="system-status">
          <div class="status-dot"></div>
          <span>Sistema Online</span>
        </div>

        <strong>SITRAN Manager</strong>

        <p>
          Desenvolvido por Kisley Lity
        </p>
      </div>
    </aside>
  `
}
function renderHeader(title, subtitle, actions = '') {
  return `
    <div class="page-header">
      <div>
        <div class="tag">Estado do Espírito Santo</div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" id="refreshDataBtn">Atualizar dados</button>
        ${actions}
      </div>
    </div>
  `
}

function renderDashboard() {
  const summary = state.data.dashboard?.summary || {}
  const recent = state.data.dashboard?.recentChecklists || []
  const maintenanceAlerts = state.data.dashboard?.maintenanceAlerts || []
  const cnhAlerts = state.data.dashboard?.cnhAlerts || []

  const totalChecklists = Number(summary.totalChecklists || 0)
  const okChecklists = Math.max(
    totalChecklists - Number(summary.pendingChecklists || 0) - Number(summary.problemChecklists || 0),
    0
  )

  const statusTotal = Math.max(
    okChecklists + Number(summary.pendingChecklists || 0) + Number(summary.problemChecklists || 0),
    1
  )

  const okPercent = Math.round((okChecklists / statusTotal) * 100)
  const pendingPercent = Math.round((Number(summary.pendingChecklists || 0) / statusTotal) * 100)
  const problemPercent = Math.round((Number(summary.problemChecklists || 0) / statusTotal) * 100)

  return `
    ${renderHeader('Centro de Operações SITRAN', 'Visão rápida da frota, checklists, condutores e manutenções.')}

    <section class="hero-card compact-hero premium-hero">
      <div>
        <div class="tag">Operação em campo</div>
        <h3>Resumo geral da operação</h3>
        <p>Acompanhe os checklists recebidos, pendências, problemas e alertas importantes.</p>
      </div>
      <div class="hero-metrics">
        <div class="metric"><strong>${summary.totalVehicles || 0}</strong><span>Veículos</span></div>
        <div class="metric"><strong>${summary.totalDrivers || 0}</strong><span>Condutores</span></div>
        <div class="metric"><strong>${summary.totalChecklists || 0}</strong><span>Checklists</span></div>
      </div>
    </section>

    <section class="cards-grid six">
      <div class="info-card blue"><span>Veículos ativos</span><strong>${summary.activeVehicles || 0}</strong></div>
      <div class="info-card orange"><span>Em manutenção</span><strong>${summary.maintenanceVehicles || 0}</strong></div>
      <div class="info-card purple"><span>Condutores ativos</span><strong>${summary.activeDrivers || 0}</strong></div>
      <div class="info-card olive"><span>Checklists pendentes</span><strong>${summary.pendingChecklists || 0}</strong></div>
      <div class="info-card wine"><span>Com problema</span><strong>${summary.problemChecklists || 0}</strong></div>
      <div class="info-card cyan"><span>Com foto</span><strong>${summary.checklistsWithPhotos || 0}</strong></div>
    </section>

    <section class="panel-grid two analytics-row">
      <div class="panel-card analytics-card">
        <div class="panel-card-header">
          <h3>Status dos checklists</h3>
          <p>Resumo visual da operação com base nos registros atuais.</p>
        </div>

        <div class="operation-score">
          <div>
            <span>Saúde operacional</span>
            <strong>${problemPercent > 30 ? 'Atenção' : pendingPercent > 30 ? 'Monitorar' : 'Estável'}</strong>
          </div>
          <div class="score-ring">
            <span>${100 - problemPercent}%</span>
          </div>
        </div>

        <div class="bar-list">
          <div class="bar-item">
            <div><strong>OK</strong><span>${okChecklists} registro(s)</span></div>
            <div class="bar-track"><div class="bar-fill ok" style="width:${okPercent}%"></div></div>
          </div>

          <div class="bar-item">
            <div><strong>Pendentes</strong><span>${summary.pendingChecklists || 0} registro(s)</span></div>
            <div class="bar-track"><div class="bar-fill pending" style="width:${pendingPercent}%"></div></div>
          </div>

          <div class="bar-item">
            <div><strong>Problemas</strong><span>${summary.problemChecklists || 0} registro(s)</span></div>
            <div class="bar-track"><div class="bar-fill problem" style="width:${problemPercent}%"></div></div>
          </div>
        </div>
        <div class="chart-box">
          <canvas id="checklistStatusChart"></canvas>
        </div>
      </div>

      <div class="panel-card analytics-card">
        <div class="panel-card-header">
          <h3>Indicadores rápidos</h3>
          <p>Leitura executiva da situação atual.</p>
        </div>

        <div class="insight-list">
          <div class="insight-item">
            <span>🚛</span>
            <div><strong>${summary.activeVehicles || 0} veículos ativos</strong><p>Disponíveis para operação.</p></div>
          </div>

          <div class="insight-item">
            <span>🛠️</span>
            <div><strong>${maintenanceAlerts.length} alerta(s) de manutenção</strong><p>Itens que exigem atenção.</p></div>
          </div>

          <div class="insight-item">
            <span>📸</span>
            <div><strong>${summary.checklistsWithPhotos || 0} checklist(s) com foto</strong><p>Evidências registradas em campo.</p></div>
          </div>
        </div>
        <div class="chart-box small">
          <canvas id="fleetChart"></canvas>
        </div>
      </div>
    </section>

    <section class="panel-grid two">
      <div class="panel-card">
        <div class="panel-card-header">
          <h3>Últimos checklists recebidos</h3>
          <p>Entradas reais do app com status e itens verificados.</p>
        </div>
        <div class="recent-checks-grid">
          ${recent.length ? recent.map((item) => {
            const stats = checklistItemStats(item.items || [])
            return `
              <button class="${getChecklistCardClass(item)}" data-view-checklist="${item.id}">
                <div class="check-card-top">
                  <span class="check-card-title">${escapeHtml(item.vehicle?.prefix || item.vehicle?.plate || '-')}</span>
                  <span class="${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
                </div>
                <strong>${escapeHtml(item.driver?.name || '-')}</strong>
                <p>${escapeHtml(item.type || '-')} • ${formatDateTime(item.createdAt)}</p>
                <div class="micro-stats">
                  <span>OK ${stats.ok}</span>
                  <span>PEND. ${stats.pending}</span>
                  <span>PROB. ${stats.problem}</span>
                  <span>FOTOS ${stats.photos}</span>
                </div>
              </button>
            `
          }).join('') : '<p>Nenhum checklist encontrado.</p>'}
        </div>
      </div>

      <div class="stacked-panels">
        <div class="panel-card compact">
          <div class="panel-card-header">
            <h3>Alertas de manutenção</h3>
            <p>Serviços abertos e vencimentos próximos.</p>
          </div>
          <div class="alert-list">
            ${maintenanceAlerts.length ? maintenanceAlerts.map((item) => `
              <div class="alert-item danger-soft">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.vehicle?.prefix || item.vehicle?.plate || '-')} • ${item.dueInDays == null ? 'Sem data' : `${item.dueInDays} dia(s)`}</span>
              </div>
            `).join('') : '<p class="muted-block">Sem alertas de manutenção no momento.</p>'}
          </div>
        </div>

        <div class="panel-card compact">
          <div class="panel-card-header">
            <h3>CNHs próximas do vencimento</h3>
            <p>Controle preventivo de condutores.</p>
          </div>
          <div class="alert-list">
            ${cnhAlerts.length ? cnhAlerts.map((item) => `
              <div class="alert-item warning-soft">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${formatDate(item.expiresAt)} • ${item.expiresInDays} dia(s)</span>
              </div>
            `).join('') : '<p class="muted-block">Sem CNH vencendo nos próximos 30 dias.</p>'}
          </div>
        </div>
      </div>
    </section>
  `
}
function renderVehicles() {
  return `
    ${renderHeader('Veículos', 'Cadastro completo e histórico da frota operacional.', '<button class="primary-btn" id="newVehicleBtn">+ Novo veículo</button>')}
    <section class="panel-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Placa</th><th>Prefixo</th><th>Modelo</th><th>Marca</th><th>Ano</th><th>Setor</th><th>Unidade</th><th>Status</th><th>Km</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${state.data.vehicles.map((item) => `
              <tr>
                <td>${escapeHtml(item.plate)}</td>
                <td>${escapeHtml(item.prefix || '-')}</td>
                <td>${escapeHtml(item.model)}</td>
                <td>${escapeHtml(item.brand)}</td>
                <td>${item.year}</td>
                <td>${escapeHtml(item.sector || '-')}</td>
                <td>${escapeHtml(item.unit || '-')}</td>
                <td><span class="${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>${item.mileage}</td>
                <td class="actions-cell">
                  <button class="table-btn" data-edit-vehicle="${item.id}">Editar</button>
                  <button class="table-btn danger" data-delete-vehicle="${item.id}">Excluir</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="10">Nenhum veículo cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderDrivers() {
  return `
    ${renderHeader('Condutores', 'Cadastro completo com validade de CNH e dados operacionais.', '<button class="primary-btn" id="newDriverBtn">+ Novo condutor</button>')}
    <section class="panel-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>CPF</th><th>CNH</th><th>Categoria</th><th>Telefone</th><th>Status</th><th>Validade</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${state.data.drivers.map((item) => {
              const expiresIn = daysUntil(item.expiresAt)
              return `
                <tr>
                  <td>${escapeHtml(item.name)}</td>
                  <td>${escapeHtml(item.cpf)}</td>
                  <td>${escapeHtml(item.cnh)}</td>
                  <td>${escapeHtml(item.category)}</td>
                  <td>${escapeHtml(item.phone || '-')}</td>
                  <td><span class="${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                  <td>
                    ${formatDate(item.expiresAt)}
                    ${expiresIn != null && expiresIn <= 30 ? `<div class="tiny-alert">${expiresIn < 0 ? 'Vencida' : `${expiresIn} dia(s)`}</div>` : ''}
                  </td>
                  <td class="actions-cell">
                    <button class="table-btn" data-edit-driver="${item.id}">Editar</button>
                    <button class="table-btn danger" data-delete-driver="${item.id}">Excluir</button>
                  </td>
                </tr>
              `
            }).join('') || '<tr><td colspan="8">Nenhum condutor cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderChecklistFilters() {
  const filters = state.ui.checklistFilters
  return `
    <section class="panel-card filters-card">
      <div class="form-grid four-col">
        <label><span>Buscar</span><input id="filterSearch" value="${escapeHtml(filters.search)}" placeholder="Veículo, condutor, tipo ou local" /></label>
        <label><span>Status</span>
          <select id="filterStatus">
            <option value="">Todos</option>
            ${checklistStatusOptions.map((option) => `<option value="${option}" ${filters.status === option ? 'selected' : ''}>${option}</option>`).join('')}
          </select>
        </label>
        <label><span>Veículo</span>
          <select id="filterVehicle">
            <option value="">Todos</option>
            ${state.data.vehicles.map((item) => `<option value="${item.id}" ${filters.vehicleId === item.id ? 'selected' : ''}>${escapeHtml(item.prefix || item.plate)} - ${escapeHtml(item.model)}</option>`).join('')}
          </select>
        </label>
        <label><span>Condutor</span>
          <select id="filterDriver">
            <option value="">Todos</option>
            ${state.data.drivers.map((item) => `<option value="${item.id}" ${filters.driverId === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}
          </select>
        </label>
        <label><span>Data inicial</span><input id="filterDateFrom" type="date" value="${filters.dateFrom}" /></label>
        <label><span>Data final</span><input id="filterDateTo" type="date" value="${filters.dateTo}" /></label>
        <div class="form-actions align-left full-span-mobile">
          <button class="ghost-btn" id="clearChecklistFilters" type="button">Limpar filtros</button>
        </div>
      </div>
    </section>
  `
}

function renderChecklists() {
  const filtered = getFilteredChecklists()
  const totals = filtered.reduce(
    (acc, item) => {
      acc.total += 1
      if (item.status === 'PROBLEMA') acc.problems += 1
      if (item.status === 'PENDENTE') acc.pending += 1
      if (item.driverPhoto || (item.items || []).some((checkItem) => checkItem.photoUrl)) acc.withPhotos += 1
      return acc
    },
    { total: 0, problems: 0, pending: 0, withPhotos: 0 },
  )

  return `
    ${renderHeader('Checklists', 'Registros enviados pelo app com foto do funcionário, número fixo e status da vistoria.', '<button class="primary-btn" id="newChecklistBtn">+ Novo checklist</button>')}

    <section class="cards-grid four compact-grid">
      <div class="info-card blue compact"><span>Total filtrado</span><strong>${totals.total}</strong></div>
      <div class="info-card wine compact"><span>Com problema</span><strong>${totals.problems}</strong></div>
      <div class="info-card olive compact"><span>Pendentes</span><strong>${totals.pending}</strong></div>
      <div class="info-card cyan compact"><span>Com foto</span><strong>${totals.withPhotos}</strong></div>
    </section>

    ${renderChecklistFilters()}

    <section class="panel-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nº</th><th>Data</th><th>Tipo</th><th>Veículo</th><th>Funcionário</th><th>Local</th><th>Status</th><th>Itens</th><th>Fotos</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${filtered.map((item) => {
              const stats = checklistItemStats(item.items || [])
              return `
                <tr>
                  <td><strong>${formatChecklistNumber(item)}</strong></td>
                  <td>${formatDateTime(item.createdAt)}</td>
                  <td>${escapeHtml(item.type)}</td>
                  <td>${escapeHtml(item.vehicle?.prefix || item.vehicle?.plate || '-')}</td>
                  <td>
                    <div class="driver-table-cell">
                      ${renderDriverAvatar(item, 'small')}
                      <span>${escapeHtml(item.driver?.name || '-')}</span>
                    </div>
                  </td>
                  <td>${escapeHtml(item.location || '-')}</td>
                  <td><span class="${getStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                  <td>${stats.total}</td>
                  <td>${stats.photos + (item.driverPhoto ? 1 : 0)}</td>
                  <td class="actions-cell">
                    <button class="table-btn" data-view-checklist="${item.id}">Ver</button>
                    <button class="table-btn" data-edit-checklist="${item.id}">Editar</button>
                    <button class="table-btn danger" data-delete-checklist="${item.id}">Excluir</button>
                  </td>
                </tr>
              `
            }).join('') || '<tr><td colspan="10">Nenhum checklist encontrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderMaintenances() {
  const totals = state.data.maintenances.reduce((acc, item) => {
    const alert = getMaintenanceAlert(item).label
    acc.total += 1
    if (alert === 'Manutenção vencida') acc.expired += 1
    if (alert === 'Próxima manutenção') acc.soon += 1
    if (item.status === 'CONCLUIDA') acc.done += 1
    return acc
  }, { total: 0, expired: 0, soon: 0, done: 0 })

  return `
    ${renderHeader('Manutenções', 'Controle de manutenção feita, próxima manutenção, quilometragem e alertas automáticos na tela.', '<button class="primary-btn" id="newMaintenanceBtn">+ Nova manutenção</button>')}

    <section class="cards-grid four compact-grid">
      <div class="info-card blue compact"><span>Total</span><strong>${totals.total}</strong></div>
      <div class="info-card wine compact"><span>Vencidas</span><strong>${totals.expired}</strong></div>
      <div class="info-card olive compact"><span>Próximas</span><strong>${totals.soon}</strong></div>
      <div class="info-card green compact"><span>Concluídas</span><strong>${totals.done}</strong></div>
    </section>

    <section class="panel-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Manutenção</th><th>Veículo</th><th>Feita em</th><th>Próxima data</th><th>KM atual</th><th>Próximo KM</th><th>Aviso</th><th>Custo</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${state.data.maintenances.map((item) => {
              const alert = getMaintenanceAlert(item)
              return `
                <tr>
                  <td><strong>${escapeHtml(item.title)}</strong><div class="muted-block">${escapeHtml(item.description || '')}</div></td>
                  <td>${escapeHtml(item.vehicle?.prefix || item.vehicle?.plate || '-')}</td>
                  <td>${formatDate(item.performedAt)}</td>
                  <td>${formatDate(item.dueDate)}</td>
                  <td>${formatKm(item.currentKm)}</td>
                  <td>${formatKm(item.nextMaintenanceKm)}</td>
                  <td><span class="${alert.className}">${escapeHtml(alert.label)}</span></td>
                  <td>${formatCurrency(item.cost)}</td>
                  <td class="actions-cell">
                    <button class="table-btn" data-edit-maintenance="${item.id}">Editar</button>
                    <button class="table-btn danger" data-delete-maintenance="${item.id}">Excluir</button>
                  </td>
                </tr>
              `
            }).join('') || '<tr><td colspan="9">Nenhuma manutenção cadastrada.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}
function renderUsers() {
  return `
    ${renderHeader('Usuários', 'Gestão dos acessos administrativos do painel.', '<button class="primary-btn" id="newUserBtn">+ Novo usuário</button>')}
    <section class="panel-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Criado em</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${state.data.users.map((item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.email)}</td>
                <td><span class="${getStatusClass(item.role)}">${escapeHtml(item.role)}</span></td>
                <td>${formatDate(item.createdAt)}</td>
                <td class="actions-cell">
                  <button class="table-btn" data-edit-user="${item.id}">Editar</button>
                  <button class="table-btn danger" data-delete-user="${item.id}">Excluir</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5">Nenhum usuário cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}


function renderAbout() {
  return `
    ${renderHeader('Sobre o sistema', 'Informações oficiais do SITRAN Manager.')}

    <section class="panel-card about-card">
      <div class="tag">SITRAN Manager v1.0</div>

      <h3>Sistema de gestão operacional</h3>

      <p>
        Plataforma desenvolvida para controle de checklists, frota,
        condutores, usuários e manutenções da operação SITRAN.
      </p>

      <div class="about-divider"></div>

      <p><strong>Desenvolvido por:</strong> Kisley Lity</p>
      <p><strong>Empresa:</strong> Sitran Sinalização Industrial Ltda ES</p>
      <p><strong>Ano:</strong> 2026</p>

      <div class="about-signature">
        © 2026 SITRAN Manager • Desenvolvido por Kisley Lity
      </div>
    </section>
  `
}

function renderContent() {
  if (state.ui.loading) {
    return `${renderHeader('SITRAN Manager', 'Carregando dados do painel...')}<section class="panel-card"><p>Carregando...</p></section>`
  }

  switch (state.activePage) {
    case 'vehicles':
      return renderVehicles()
    case 'drivers':
      return renderDrivers()
    case 'checklists':
      return renderChecklists()
    case 'maintenances':
      return renderMaintenances()
    case 'users':
      return renderUsers()
    case 'about':
      return renderAbout()
    default:
      return renderDashboard()
  }
}


function destroyDashboardCharts() {
  Object.values(dashboardCharts).forEach((chart) => {
    if (chart) chart.destroy()
  })

  dashboardCharts.checklistStatus = null
  dashboardCharts.fleet = null
}

function renderDashboardCharts() {
  destroyDashboardCharts()

  if (state.activePage !== 'dashboard' || state.ui.loading) return

  const summary = state.data.dashboard?.summary || {}
  const checklistCanvas = document.querySelector('#checklistStatusChart')
  const fleetCanvas = document.querySelector('#fleetChart')

  const totalChecklists = Number(summary.totalChecklists || 0)
  const pendingChecklists = Number(summary.pendingChecklists || 0)
  const problemChecklists = Number(summary.problemChecklists || 0)
  const okChecklists = Math.max(totalChecklists - pendingChecklists - problemChecklists, 0)

  if (checklistCanvas) {
    dashboardCharts.checklistStatus = new Chart(checklistCanvas, {
      type: 'doughnut',
      data: {
        labels: ['OK', 'Pendentes', 'Problemas'],
        datasets: [{
          data: [okChecklists, pendingChecklists, problemChecklists],
          backgroundColor: ['#21d19f', '#ffb546', '#ff4d6d'],
          borderColor: 'rgba(8, 22, 40, 0.92)',
          borderWidth: 4,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: {
          duration: 900,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#dce8fb',
              boxWidth: 12,
              padding: 18,
              font: {
                size: 12,
                weight: '700',
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(8, 22, 40, 0.96)',
            borderColor: 'rgba(126,224,255,.22)',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#dce8fb',
            padding: 12,
          },
        },
      },
    })
  }

  if (fleetCanvas) {
    const activeVehicles = Number(summary.activeVehicles || 0)
    const maintenanceVehicles = Number(summary.maintenanceVehicles || 0)
    const inactiveVehicles = Math.max(Number(summary.totalVehicles || 0) - activeVehicles - maintenanceVehicles, 0)

    dashboardCharts.fleet = new Chart(fleetCanvas, {
      type: 'bar',
      data: {
        labels: ['Ativos', 'Manutenção', 'Inativos'],
        datasets: [{
          label: 'Veículos',
          data: [activeVehicles, maintenanceVehicles, inactiveVehicles],
          backgroundColor: ['#2cb7ea', '#ffb546', '#64748b'],
          borderRadius: 14,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart',
        },
        scales: {
          x: {
            ticks: { color: '#dce8fb' },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#dce8fb',
              precision: 0,
            },
            grid: { color: 'rgba(255,255,255,.06)' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8, 22, 40, 0.96)',
            borderColor: 'rgba(126,224,255,.22)',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#dce8fb',
            padding: 12,
          },
        },
      },
    })
  }
}

function renderApp() {
  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      <main class="main-content">${renderContent()}</main>
    </div>
    <div id="modalRoot"></div>
  `
  bindGlobalEvents()

  requestAnimationFrame(() => {
    renderDashboardCharts()
  })
}

function openModal(title, content, wide = false) {
  document.querySelector('#modalRoot').innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-card ${wide ? 'wide' : ''}">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="icon-btn" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>
  `

  document.querySelector('#closeModalBtn')?.addEventListener('click', closeModal)
  document.querySelector('#modalOverlay')?.addEventListener('click', (event) => {
    if (event.target.id === 'modalOverlay') closeModal()
  })
}

function closeModal() {
  const modalRoot = document.querySelector('#modalRoot')
  if (modalRoot) modalRoot.innerHTML = ''
}

function vehicleFormTemplate(vehicle = {}) {
  return `
    <form id="vehicleForm" data-id="${vehicle.id || ''}" class="form-grid two-col">
      <label><span>Placa</span><input name="plate" value="${escapeHtml(vehicle.plate || '')}" required /></label>
      <label><span>Prefixo</span><input name="prefix" value="${escapeHtml(vehicle.prefix || '')}" /></label>
      <label><span>Modelo</span><input name="model" value="${escapeHtml(vehicle.model || '')}" required /></label>
      <label><span>Marca</span><input name="brand" value="${escapeHtml(vehicle.brand || '')}" required /></label>
      <label><span>Ano</span><input type="number" name="year" value="${vehicle.year || ''}" required /></label>
      <label><span>Quilometragem</span><input type="number" name="mileage" value="${vehicle.mileage || 0}" /></label>
      <label><span>Setor</span><input name="sector" value="${escapeHtml(vehicle.sector || '')}" /></label>
      <label><span>Unidade</span><input name="unit" value="${escapeHtml(vehicle.unit || '')}" /></label>
      <label><span>Status</span><select name="status">${vehicleStatusOptions.map((option) => `<option ${vehicle.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label><span>Última revisão</span><input type="date" name="lastReviewAt" value="${vehicle.lastReviewAt ? new Date(vehicle.lastReviewAt).toISOString().slice(0, 10) : ''}" /></label>
      <div class="form-actions full-row"><button class="primary-btn" type="submit">Salvar veículo</button></div>
    </form>
  `
}

function driverFormTemplate(driver = {}) {
  return `
    <form id="driverForm" data-id="${driver.id || ''}" class="form-grid two-col">
      <label><span>Nome</span><input name="name" value="${escapeHtml(driver.name || '')}" required /></label>
      <label><span>CPF</span><input name="cpf" value="${escapeHtml(driver.cpf || '')}" required /></label>
      <label><span>CNH</span><input name="cnh" value="${escapeHtml(driver.cnh || '')}" required /></label>
      <label><span>Categoria</span><input name="category" value="${escapeHtml(driver.category || '')}" required /></label>
      <label><span>Telefone</span><input name="phone" value="${escapeHtml(driver.phone || '')}" /></label>
      <label><span>E-mail</span><input name="email" type="email" value="${escapeHtml(driver.email || '')}" /></label>
      <label><span>Status</span><select name="status">${driverStatusOptions.map((option) => `<option ${driver.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label><span>Validade CNH</span><input type="date" name="expiresAt" value="${driver.expiresAt ? new Date(driver.expiresAt).toISOString().slice(0, 10) : ''}" required /></label>
      <label class="full-row"><span>Observações</span><textarea name="notes">${escapeHtml(driver.notes || '')}</textarea></label>
      <div class="form-actions full-row"><button class="primary-btn" type="submit">Salvar condutor</button></div>
    </form>
  `
}

function checklistItemsHtml(items = [{ label: '', status: 'PENDENTE', notes: '', photoUrl: '' }]) {
  return items.map((item, index) => `
    <div class="subcard checklist-item-row" data-index="${index}">
      <div class="item-row-grid">
        <label><span>Item</span><input name="item-label" value="${escapeHtml(item.label || '')}" required /></label>
        <label><span>Status</span><select name="item-status">${checklistStatusOptions.map((option) => `<option ${item.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      </div>
      <label class="full-row"><span>Observações</span><input name="item-notes" value="${escapeHtml(item.notes || '')}" /></label>
      <label class="full-row"><span>Foto (URL ou base64)</span><textarea name="item-photo" placeholder="Cole a imagem em base64 ou mantenha o valor atual se veio do app">${escapeHtml(item.photoUrl || '')}</textarea></label>
      <div class="item-footer-row">
        ${item.photoUrl ? `<a class="table-btn" href="${buildAssetUrl(item.photoUrl)}" target="_blank" rel="noreferrer">Ver foto</a>` : '<span class="muted-pill">Sem foto</span>'}
        <button class="table-btn danger remove-item-btn" type="button">Remover item</button>
      </div>
    </div>
  `).join('')
}

function checklistFormTemplate(checklist = {}) {
  return `
    <form id="checklistForm" data-id="${checklist.id || ''}" class="form-grid two-col">
      <label><span>Veículo</span><select name="vehicleId" required>${state.data.vehicles.map((item) => `<option value="${item.id}" ${checklist.vehicleId === item.id ? 'selected' : ''}>${escapeHtml(item.prefix || item.plate)} - ${escapeHtml(item.model)}</option>`).join('')}</select></label>
      <label><span>Condutor</span><select name="driverId" required>${state.data.drivers.map((item) => `<option value="${item.id}" ${checklist.driverId === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
      <label><span>Tipo</span><input name="type" value="${escapeHtml(checklist.type || 'SAIDA')}" required /></label>
      <label><span>Status geral</span><select name="status">${checklistStatusOptions.map((option) => `<option ${checklist.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label><span>Odômetro</span><input type="number" name="odometer" value="${checklist.odometer || ''}" /></label>
      <label><span>Local</span><input name="location" value="${escapeHtml(checklist.location || '')}" /></label>
      <label class="full-row"><span>Foto do funcionário (URL ou base64)</span><textarea name="driverPhoto" placeholder="Foto registrada pelo app">${escapeHtml(checklist.driverPhoto || '')}</textarea></label>
      ${checklist.driverPhoto ? `<div class="full-row"><a class="table-btn" href="${buildAssetUrl(checklist.driverPhoto)}" target="_blank" rel="noreferrer">Ver foto do funcionário</a></div>` : ''}
      <label class="full-row"><span>Observações gerais</span><textarea name="notes">${escapeHtml(checklist.notes || '')}</textarea></label>
      <div class="full-row">
        <div class="inline-head">
          <h4>Itens do checklist</h4>
          <button class="table-btn" id="addChecklistItemBtn" type="button">+ Adicionar item</button>
        </div>
        <div id="checklistItemsWrapper" class="stacked">${checklistItemsHtml(checklist.items?.length ? checklist.items : undefined)}</div>
      </div>
      <div class="form-actions full-row"><button class="primary-btn" type="submit">Salvar checklist</button></div>
    </form>
  `
}

function maintenanceFormTemplate(maintenance = {}) {
  return `
    <form id="maintenanceForm" data-id="${maintenance.id || ''}" class="form-grid two-col">
      <label><span>Veículo</span><select name="vehicleId" required>${state.data.vehicles.map((item) => `<option value="${item.id}" ${maintenance.vehicleId === item.id ? 'selected' : ''}>${escapeHtml(item.prefix || item.plate)} - ${escapeHtml(item.model)}</option>`).join('')}</select></label>
      <label><span>Status</span><select name="status">${maintenanceStatusOptions.map((option) => `<option ${maintenance.status === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label><span>Manutenção feita</span><input name="title" value="${escapeHtml(maintenance.title || '')}" placeholder="Ex: Troca de óleo" required /></label>
      <label><span>Data da manutenção feita</span><input type="date" name="performedAt" value="${maintenance.performedAt ? new Date(maintenance.performedAt).toISOString().slice(0, 10) : ''}" /></label>
      <label><span>Próxima manutenção em</span><input type="date" name="dueDate" value="${maintenance.dueDate ? new Date(maintenance.dueDate).toISOString().slice(0, 10) : ''}" /></label>
      <label><span>KM atual</span><input type="number" name="currentKm" value="${maintenance.currentKm || ''}" placeholder="KM no dia da manutenção" /></label>
      <label><span>Próxima manutenção no KM</span><input type="number" name="nextMaintenanceKm" value="${maintenance.nextMaintenanceKm || ''}" /></label>
      <label><span>Custo</span><input type="number" step="0.01" name="cost" value="${maintenance.cost || ''}" /></label>
      <label class="full-row"><span>Observações</span><textarea name="description" placeholder="Peças trocadas, oficina, garantia e observações">${escapeHtml(maintenance.description || '')}</textarea></label>
      <div class="form-actions full-row"><button class="primary-btn" type="submit">Salvar manutenção</button></div>
    </form>
  `
}
function userFormTemplate(user = {}) {
  return `
    <form id="userForm" data-id="${user.id || ''}" class="form-grid two-col">
      <label><span>Nome</span><input name="name" value="${escapeHtml(user.name || '')}" required /></label>
      <label><span>E-mail</span><input type="email" name="email" value="${escapeHtml(user.email || '')}" required /></label>
      <label><span>Perfil</span><select name="role">${userRoleOptions.map((option) => `<option ${user.role === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label><span>Senha</span><input name="password" value="" placeholder="Digite para definir/alterar" /></label>
      <div class="form-actions full-row"><button class="primary-btn" type="submit">Salvar usuário</button></div>
    </form>
  `
}

function renderChecklistDetails(checklist) {
  const stats = checklistItemStats(checklist.items || [])
  return `
    <div class="stacked big-gap">
      <section class="detail-hero clean-detail">
        <div class="detail-person">
          ${renderDriverAvatar(checklist, 'large')}
          <div>
            <div class="tag">${formatChecklistNumber(checklist)}</div>
            <h3>${escapeHtml(checklist.driver?.name || '-')}</h3>
            <p>${escapeHtml(checklist.type || '-')} • ${formatDateTime(checklist.createdAt)} • ${escapeHtml(checklist.location || 'Sem local informado')}</p>
            <p class="detail-vehicle-line">${escapeHtml(checklist.vehicle?.prefix || checklist.vehicle?.plate || '-')} • ${escapeHtml(checklist.vehicle?.model || 'Veículo')}</p>
          </div>
        </div>
        <div class="detail-badges">
          <span class="${getStatusClass(checklist.status)}">${escapeHtml(checklist.status)}</span>
          <span class="badge">Itens ${stats.total}</span>
          <span class="badge">Fotos ${stats.photos + (checklist.driverPhoto ? 1 : 0)}</span>
        </div>
      </section>

      <section class="cards-grid four compact-grid">
        <div class="info-card blue compact"><span>OK</span><strong>${stats.ok}</strong></div>
        <div class="info-card olive compact"><span>Pendentes</span><strong>${stats.pending}</strong></div>
        <div class="info-card wine compact"><span>Problemas</span><strong>${stats.problem}</strong></div>
        <div class="info-card cyan compact"><span>Odômetro</span><strong>${checklist.odometer || 0}</strong></div>
      </section>

      <section class="panel-card detail-block">
        <div class="panel-card-header">
          <h3>Resumo geral</h3>
        </div>
        <div class="summary-grid two">
          <div class="subcard"><strong>Veículo</strong><p>${escapeHtml(checklist.vehicle?.plate || '-')} • ${escapeHtml(checklist.vehicle?.model || '-')}</p></div>
          <div class="subcard"><strong>Funcionário</strong><p>${escapeHtml(checklist.driver?.name || '-')}</p></div>
          <div class="subcard"><strong>Número</strong><p>${formatChecklistNumber(checklist)}</p></div>
          <div class="subcard"><strong>Local</strong><p>${escapeHtml(checklist.location || 'Não informado')}</p></div>
          <div class="subcard"><strong>Data/Hora</strong><p>${formatDateTime(checklist.createdAt)}</p></div>
          <div class="subcard full-row photo-subcard"><strong>Foto do funcionário</strong>${checklist.driverPhoto ? `<div class="photo-preview-wrap"><img class="photo-preview driver-photo" src="${buildAssetUrl(checklist.driverPhoto)}" alt="Foto do funcionário" /><a class="table-btn" href="${buildAssetUrl(checklist.driverPhoto)}" target="_blank" rel="noreferrer">Abrir foto</a></div>` : '<p>Sem foto registrada.</p>'}</div>
          <div class="subcard full-row"><strong>Observações gerais</strong><p>${escapeHtml(checklist.notes || 'Sem observações gerais')}</p></div>
        </div>
      </section>

      <section class="panel-card detail-block">
        <div class="panel-card-header">
          <h3>Itens verificados</h3>
          <p>Status visual, observação por item e evidência fotográfica.</p>
        </div>
        <div class="item-detail-list">
          ${(checklist.items || []).map((item) => `
            <div class="item-detail-card ${String(item.status || '').toLowerCase()}">
              <div class="item-detail-header">
                <strong>${escapeHtml(item.label)}</strong>
                <span class="${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
              </div>
              <p>${escapeHtml(item.notes || 'Sem observação para este item.')}</p>
              ${item.photoUrl ? `
                <div class="photo-preview-wrap">
                  <img class="photo-preview" src="${buildAssetUrl(item.photoUrl)}" alt="Foto do item ${escapeHtml(item.label)}" />
                  <a class="table-btn" href="${buildAssetUrl(item.photoUrl)}" target="_blank" rel="noreferrer">Abrir imagem</a>
                </div>
              ` : '<div class="muted-block">Sem foto neste item.</div>'}
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `
}

function bindGlobalEvents() {
  document.querySelectorAll('[data-page]').forEach((item) => {
    item.addEventListener('click', () => {
      state.activePage = item.dataset.page
      renderApp()
    })
  })

  document.querySelector('#refreshDataBtn')?.addEventListener('click', loadAllData)

  bindFilterEvents()

  document.querySelector('#newVehicleBtn')?.addEventListener('click', () => {
    openModal('Novo veículo', vehicleFormTemplate())
    bindVehicleForm()
  })

  document.querySelectorAll('[data-edit-vehicle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vehicle = state.data.vehicles.find((item) => item.id === btn.dataset.editVehicle)
      openModal('Editar veículo', vehicleFormTemplate(vehicle))
      bindVehicleForm()
    })
  })

  document.querySelectorAll('[data-delete-vehicle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir veículo?')) return
      await apiDelete(`/vehicles/${btn.dataset.deleteVehicle}`)
      await loadAllData()
    })
  })

  document.querySelector('#newDriverBtn')?.addEventListener('click', () => {
    openModal('Novo condutor', driverFormTemplate())
    bindDriverForm()
  })

  document.querySelectorAll('[data-edit-driver]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const driver = state.data.drivers.find((item) => item.id === btn.dataset.editDriver)
      openModal('Editar condutor', driverFormTemplate(driver))
      bindDriverForm()
    })
  })

  document.querySelectorAll('[data-delete-driver]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir condutor?')) return
      await apiDelete(`/drivers/${btn.dataset.deleteDriver}`)
      await loadAllData()
    })
  })

  document.querySelector('#newChecklistBtn')?.addEventListener('click', () => {
    openModal('Novo checklist', checklistFormTemplate(), true)
    bindChecklistForm()
  })

  document.querySelectorAll('[data-view-checklist]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const checklist = state.data.checklists.find((item) => item.id === btn.dataset.viewChecklist)
      openModal('Visualização completa do checklist', renderChecklistDetails(checklist), true)
    })
  })

  document.querySelectorAll('[data-edit-checklist]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const checklist = state.data.checklists.find((item) => item.id === btn.dataset.editChecklist)
      openModal('Editar checklist', checklistFormTemplate(checklist), true)
      bindChecklistForm()
    })
  })

  document.querySelectorAll('[data-delete-checklist]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir checklist?')) return
      await apiDelete(`/checklists/${btn.dataset.deleteChecklist}`)
      await loadAllData()
    })
  })

  document.querySelector('#newMaintenanceBtn')?.addEventListener('click', () => {
    openModal('Nova manutenção', maintenanceFormTemplate())
    bindMaintenanceForm()
  })

  document.querySelectorAll('[data-edit-maintenance]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const maintenance = state.data.maintenances.find((item) => item.id === btn.dataset.editMaintenance)
      openModal('Editar manutenção', maintenanceFormTemplate(maintenance))
      bindMaintenanceForm()
    })
  })

  document.querySelectorAll('[data-delete-maintenance]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir manutenção?')) return
      await apiDelete(`/maintenances/${btn.dataset.deleteMaintenance}`)
      await loadAllData()
    })
  })

  document.querySelector('#newUserBtn')?.addEventListener('click', () => {
    openModal('Novo usuário', userFormTemplate())
    bindUserForm()
  })

  document.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const user = state.data.users.find((item) => item.id === btn.dataset.editUser)
      openModal('Editar usuário', userFormTemplate(user))
      bindUserForm()
    })
  })

  document.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir usuário?')) return
      await apiDelete(`/users/${btn.dataset.deleteUser}`)
      await loadAllData()
    })
  })
}

function bindFilterEvents() {
  const fields = [
    ['#filterSearch', 'search'],
    ['#filterStatus', 'status'],
    ['#filterVehicle', 'vehicleId'],
    ['#filterDriver', 'driverId'],
    ['#filterDateFrom', 'dateFrom'],
    ['#filterDateTo', 'dateTo'],
  ]

  fields.forEach(([selector, key]) => {
    document.querySelector(selector)?.addEventListener('input', (event) => {
      state.ui.checklistFilters[key] = event.target.value
      if (state.activePage === 'checklists') renderApp()
    })
    document.querySelector(selector)?.addEventListener('change', (event) => {
      state.ui.checklistFilters[key] = event.target.value
      if (state.activePage === 'checklists') renderApp()
    })
  })

  document.querySelector('#clearChecklistFilters')?.addEventListener('click', () => {
    state.ui.checklistFilters = {
      search: '',
      status: '',
      vehicleId: '',
      driverId: '',
      dateFrom: '',
      dateTo: '',
    }
    renderApp()
  })
}

function formToObject(form) {
  const formData = new FormData(form)
  return Object.fromEntries(formData.entries())
}

function bindVehicleForm() {
  document.querySelector('#vehicleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = formToObject(form)
    const id = form.dataset.id
    if (id) await apiPut(`/vehicles/${id}`, payload)
    else await apiPost('/vehicles', payload)
    closeModal()
    await loadAllData()
  })
}

function bindDriverForm() {
  document.querySelector('#driverForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = formToObject(form)
    const id = form.dataset.id
    if (id) await apiPut(`/drivers/${id}`, payload)
    else await apiPost('/drivers', payload)
    closeModal()
    await loadAllData()
  })
}

function readChecklistItems() {
  return [...document.querySelectorAll('.checklist-item-row')]
    .map((row) => ({
      label: row.querySelector('[name="item-label"]').value,
      status: row.querySelector('[name="item-status"]').value,
      notes: row.querySelector('[name="item-notes"]').value,
      photoUrl: row.querySelector('[name="item-photo"]').value,
    }))
    .filter((item) => item.label)
}

function bindChecklistForm() {
  document.querySelector('#addChecklistItemBtn')?.addEventListener('click', () => {
    const wrapper = document.querySelector('#checklistItemsWrapper')
    wrapper.insertAdjacentHTML('beforeend', checklistItemsHtml([{ label: '', status: 'PENDENTE', notes: '', photoUrl: '' }]))
    bindChecklistForm()
  })

  document.querySelectorAll('.remove-item-btn').forEach((btn) => {
    btn.onclick = () => btn.closest('.checklist-item-row')?.remove()
  })

  document.querySelector('#checklistForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = formToObject(form)
    payload.items = readChecklistItems()
    if (!payload.status) {
      payload.status = payload.items.some((item) => item.status === 'PROBLEMA')
        ? 'PROBLEMA'
        : payload.items.some((item) => item.status === 'PENDENTE')
          ? 'PENDENTE'
          : 'OK'
    }
    const id = form.dataset.id
    if (id) await apiPut(`/checklists/${id}`, payload)
    else await apiPost('/checklists', payload)
    closeModal()
    await loadAllData()
  })
}

function bindMaintenanceForm() {
  document.querySelector('#maintenanceForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = formToObject(form)
    const id = form.dataset.id
    if (id) await apiPut(`/maintenances/${id}`, payload)
    else await apiPost('/maintenances', payload)
    closeModal()
    await loadAllData()
  })
}

function bindUserForm() {
  document.querySelector('#userForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const payload = formToObject(form)
    if (!payload.password) delete payload.password
    const id = form.dataset.id
    if (id) await apiPut(`/users/${id}`, payload)
    else await apiPost('/users', payload)
    closeModal()
    await loadAllData()
  })
}

renderApp()
loadAllData()
