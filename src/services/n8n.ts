/**
 * n8n Integration Service — KINGSTAR I.O
 * Webhook handler to trigger advanced automations.
 */
import axios from 'axios';

const N8N_BASE_URL = 'https://n8n.kingstar.com/webhook'; // Exemplo

export const n8nService = {
  /**
   * Dispara alerta de divergência para o n8n
   */
  triggerDivergenceAlert: async (data: any) => {
    try {
      await axios.post(`${N8N_BASE_URL}/logistics-divergence`, data);
      return true;
    } catch (err) {
      console.error('n8n: Erro ao disparar alerta de divergência', err);
      return false;
    }
  },

  /**
   * Notifica conclusão de recebimento para o PCP
   */
  notifyReceiptCompleted: async (data: any) => {
    try {
      await axios.post(`${N8N_BASE_URL}/receipt-done`, data);
      return true;
    } catch (err) {
      console.error('n8n: Erro ao notificar PCP', err);
      return false;
    }
  }
};
