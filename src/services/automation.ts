// src/services/automation.ts

import type { Pool } from 'pg';
import type { Task } from '../types';

interface AutomationRule {
  id: number;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
}

/**
 * Processa as automações para um determinado gatilho.
 * @param triggerType O tipo de evento que ocorreu (ex: 'status_changed').
 * @param task A tarefa que disparou o gatilho.
 * @param pool A conexão com o banco de dados.
 */
export async function processAutomations(triggerType: string, task: Task, pool: Pool) {
  console.log(`[Automation] Processando gatilho '${triggerType}' para a tarefa #${task.id}`);

  // 1. Encontrar todas as regras de automação relevantes para esta lista e gatilho.
  const rulesResult = await pool.query<AutomationRule>(`
    SELECT id, trigger_type, trigger_config, action_type, action_config 
    FROM automations 
    WHERE list_id = $1 AND trigger_type = $2 AND is_enabled = true
  `, [task.list_id, triggerType]);

  const rules = rulesResult.rows;
  if (rules.length === 0) {
    return; // Nenhuma regra para processar
  }

  console.log(`[Automation] ${rules.length} regra(s) encontrada(s).`);

  // 2. Iterar sobre cada regra e verificar se as condições são atendidas.
  for (const rule of rules) {
    let shouldExecute = false;

    // Lógica de verificação do gatilho
    if (triggerType === 'status_changed') {
      // A regra especifica um status de destino?
      if (task.status_id === rule.trigger_config.to_status_id) {
        shouldExecute = true;
      }
    }

    // 3. Se as condições forem atendidas, executar a ação.
    if (shouldExecute) {
      console.log(`[Automation] Executando ação '${rule.action_type}' da regra #${rule.id}`);
      
      // Lógica de execução da ação
      if (rule.action_type === 'assign_user') {
        const { assignee_id } = rule.action_config;
        await pool.query(
          'UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2',
          [assignee_id, task.id]
        );
        console.log(`[Automation] Tarefa #${task.id} atribuída ao usuário #${assignee_id}.`);
      }
      // Adicione mais `else if` aqui para outras ações no futuro (ex: postar um comentário, mudar prioridade)
    }
  }
}