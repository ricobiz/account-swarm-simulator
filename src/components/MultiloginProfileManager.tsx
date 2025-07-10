import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const MultiloginProfileManager = () => {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [newProfile, setNewProfile] = useState({
    name: '',
    platform: 'instagram',
    browser: 'mimic',
    os: 'win'
  })
  
  const { toast } = useToast()

  const handleAction = async (action: string, data?: any) => {
    const loadingKey = `${action}_${data?.profileId || 'new'}`
    setLoading(prev => ({ ...prev, [loadingKey]: true }))
    
    try {
      console.log(`🔄 Выполняем ${action}...`)
      
      const { data: result, error } = await supabase.functions.invoke('multilogin-profiles', {
        body: { action, profileData: data || newProfile },
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (error) throw error
      
      if (result.success) {
        toast({
          title: "✅ Успешно",
          description: `Действие ${action} выполнено`,
        })
        
        // Обновляем список профилей если нужно
        if (action === 'create_profile' || action === 'list_profiles') {
          if (action === 'list_profiles') {
            setProfiles(result.data?.data || [])
          } else {
            await listProfiles() // Обновляем список после создания
          }
        }
        
        // Очищаем форму после создания
        if (action === 'create_profile') {
          setNewProfile({ name: '', platform: 'instagram', browser: 'mimic', os: 'win' })
        }
        
      } else {
        throw new Error(result.error || 'Неизвестная ошибка')
      }
      
    } catch (error) {
      console.error(`❌ Ошибка ${action}:`, error)
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const createProfile = () => handleAction('create_profile')
  const listProfiles = () => handleAction('list_profiles')
  const startProfile = (profileId: string) => handleAction('start_profile', { profileId })
  const stopProfile = (profileId: string) => handleAction('stop_profile', { profileId })

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">🔧 Управление Multilogin профилями</h1>
        <p className="text-muted-foreground">Создание и управление браузерными профилями</p>
      </div>

      {/* Создание нового профиля */}
      <Card className="border-2">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">🆕</span>
            Создать новый профиль
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Настройте параметры для нового браузерного профиля
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название профиля</Label>
              <Input
                id="name"
                value={newProfile.name}
                onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Мой профиль Instagram"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platform">Платформа</Label>
              <Select 
                value={newProfile.platform} 
                onValueChange={(value) => setNewProfile(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="browser">Браузер</Label>
              <Select 
                value={newProfile.browser} 
                onValueChange={(value) => setNewProfile(prev => ({ ...prev, browser: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mimic">Mimic</SelectItem>
                  <SelectItem value="stealthfox">StealthFox</SelectItem>
                  <SelectItem value="chrome">Chrome</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="os">Операционная система</Label>
              <Select 
                value={newProfile.os} 
                onValueChange={(value) => setNewProfile(prev => ({ ...prev, os: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">Windows</SelectItem>
                  <SelectItem value="mac">macOS</SelectItem>
                  <SelectItem value="lin">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={createProfile}
              disabled={loading.create_profile_new || !newProfile.name}
              className="flex-1"
            >
              {loading.create_profile_new ? '🔄 Создание...' : '🆕 Создать профиль'}
            </Button>
            
            <Button 
              onClick={listProfiles}
              disabled={loading.list_profiles_new}
              variant="outline"
            >
              {loading.list_profiles_new ? '🔄 Загрузка...' : '📋 Обновить список'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список существующих профилей */}
      <Card className="border-2">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Существующие профили ({profiles.length})
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Управление созданными браузерными профилями
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Профили не найдены. Создайте новый профиль или обновите список.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <Card key={profile.uuid} className="bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-foreground">{profile.name}</CardTitle>
                    <CardDescription className="text-xs">
                      ID: {profile.uuid?.substring(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      <div>Браузер: {profile.browser}</div>
                      <div>ОС: {profile.os}</div>
                      <div>Статус: <span className={profile.status === 'Active' ? 'text-green-600' : 'text-gray-600'}>{profile.status}</span></div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => startProfile(profile.uuid)}
                        disabled={loading[`start_profile_${profile.uuid}`] || profile.status === 'Active'}
                        className="flex-1 text-xs"
                      >
                        {loading[`start_profile_${profile.uuid}`] ? '🔄' : '▶️'} Запуск
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => stopProfile(profile.uuid)}
                        disabled={loading[`stop_profile_${profile.uuid}`] || profile.status !== 'Active'}
                        className="flex-1 text-xs"
                      >
                        {loading[`stop_profile_${profile.uuid}`] ? '🔄' : '⏹️'} Стоп
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}