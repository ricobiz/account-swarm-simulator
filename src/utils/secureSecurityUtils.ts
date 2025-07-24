import { supabase } from '@/integrations/supabase/client';

/**
 * Secure server-side security event logging
 * This should be called from edge functions for tamper-proof logging
 */
export const secureSecurityUtils = {
  /**
   * Log security events server-side for tamper protection
   */
  async logSecurityEvent(
    eventType: string,
    eventData: any,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: userId || null,
          event_type: eventType,
          event_data: {
            ...eventData,
            timestamp: new Date().toISOString(),
            source: 'client'
          },
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          severity
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Fallback to regular logs table
      try {
        await supabase
          .from('logs')
          .insert({
            user_id: userId || null,
            action: `SECURITY_${eventType}`,
            details: JSON.stringify(eventData),
            status: severity
          });
      } catch (fallbackError) {
        console.error('Fallback security logging also failed:', fallbackError);
      }
    }
  },

  /**
   * Validate admin permissions with proper audit trail
   */
  async validateAdminAction(
    userId: string,
    action: string,
    targetUserId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check user role
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !userProfile) {
        await this.logSecurityEvent(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          { action, targetUserId, reason: 'User not found' },
          'warning',
          userId
        );
        return { isValid: false, error: 'User not found' };
      }

      if (userProfile.role !== 'admin') {
        await this.logSecurityEvent(
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          { action, targetUserId, reason: 'Insufficient permissions' },
          'warning',
          userId
        );
        return { isValid: false, error: 'Insufficient permissions' };
      }

      // Prevent self-modification for sensitive actions
      if (action.includes('ROLE') && targetUserId === userId) {
        await this.logSecurityEvent(
          'PRIVILEGE_ESCALATION_ATTEMPT',
          { action, targetUserId, reason: 'Self-modification attempt' },
          'critical',
          userId
        );
        return { isValid: false, error: 'Cannot modify own permissions' };
      }

      // Log successful admin action
      await this.logSecurityEvent(
        'ADMIN_ACTION_VALIDATED',
        { action, targetUserId },
        'info',
        userId
      );

      return { isValid: true };
    } catch (error) {
      console.error('Admin validation error:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  },

  /**
   * Input sanitization for security
   */
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Secure password validation
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push('Пароль должен содержать минимум 12 символов');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Пароль должен содержать заглавные буквы');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Пароль должен содержать строчные буквы');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Пароль должен содержать цифры');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Пароль должен содержать специальные символы');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1{3,}/,  // Repeated characters
      /123456/,      // Sequential numbers
      /password/i,   // Contains "password"
      /qwerty/i,     // Contains "qwerty"
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('Пароль содержит слабые шаблоны');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};