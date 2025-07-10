
const { createClient } = require('@supabase/supabase-js');
const { CONFIG } = require('./config.js');

const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.serviceKey
);

class DatabaseService {
  async getPendingScenarios() {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        *,
        accounts!inner(id, username, platform, proxy_id, status),
        accounts.proxies(ip, port, country, status)
      `)
      .eq('status', 'waiting')
      .limit(10);

    if (error) {
      console.error('Error fetching scenarios:', error);
      return [];
    }

    // Remove sensitive credential data before returning
    const sanitizedData = data?.map(scenario => ({
      ...scenario,
      accounts: scenario.accounts.map(account => ({
        ...account,
        password: undefined, // Remove password from response
        proxies: account.proxies ? {
          ...account.proxies,
          username: undefined, // Remove proxy credentials
          password: undefined
        } : null
      }))
    })) || [];

    return sanitizedData;
  }

  async getAccountCredentials(accountId, userId) {
    // Separate method for getting credentials with proper authorization
    const { data, error } = await supabase
      .from('accounts')
      .select('id, username, password, platform, proxy_id, proxies(ip, port, username, password)')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching account credentials:', error);
      await this.createLog(userId, accountId, null, 'Error fetching credentials', error.message, 'error');
      return null;
    }

    // Log credential access for audit
    await this.createLog(userId, accountId, null, 'Credentials accessed', 'Account credentials retrieved for automation', 'audit');
    
    return data;
  }

  async updateScenarioStatus(scenarioId, status, progress = null) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (progress !== null) {
      updates.progress = progress;
    }

    const { error } = await supabase
      .from('scenarios')
      .update(updates)
      .eq('id', scenarioId);

    if (error) {
      console.error('Error updating scenario:', error);
      return false;
    }

    // Audit log for scenario status changes
    await supabase.rpc('audit_sensitive_operation', {
      operation_type: 'UPDATE_SCENARIO_STATUS',
      table_name: 'scenarios',
      record_id: scenarioId,
      details: { status, progress }
    });

    return true;
  }

  async updateAccountStatus(accountId, status, lastAction = null) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (lastAction) {
      updates.last_action = lastAction;
    }

    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', accountId);

    if (error) {
      console.error('Error updating account:', error);
      return false;
    }

    // Audit log for account status changes
    await supabase.rpc('audit_sensitive_operation', {
      operation_type: 'UPDATE_ACCOUNT_STATUS',
      table_name: 'accounts',
      record_id: accountId,
      details: { status, lastAction }
    });

    return true;
  }

  async createLog(userId, accountId, scenarioId, action, details, status = 'info') {
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        account_id: accountId,
        scenario_id: scenarioId,
        action,
        details,
        status
      });

    if (error) {
      console.error('Error creating log:', error);
    }
  }

  async validateUserAccess(userId, resourceId, resourceType) {
    // Security function to validate user access to resources
    let query;
    
    switch (resourceType) {
      case 'account':
        query = supabase.from('accounts').select('id').eq('id', resourceId).eq('user_id', userId);
        break;
      case 'scenario':
        query = supabase.from('scenarios').select('id').eq('id', resourceId).eq('user_id', userId);
        break;
      case 'proxy':
        query = supabase.from('proxies').select('id').eq('id', resourceId).eq('user_id', userId);
        break;
      default:
        return false;
    }

    const { data, error } = await query.single();
    
    if (error || !data) {
      await this.createLog(userId, null, null, 'Unauthorized access attempt', 
        `Attempted to access ${resourceType} ${resourceId}`, 'security');
      return false;
    }
    
    return true;
  }
}

module.exports = { supabase, DatabaseService };
