import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at?: string | null;
}

const Admin = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        toast({
          title: 'גישה נדחתה',
          description: 'רק אדמינים יכולים לגשת לדף זה',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      fetchProfiles();
    }
  }, [isAdmin, authLoading, navigate, toast]);

  const fetchProfiles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'profiles'));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Profile));
      setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את המשתמשים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const profileRef = doc(db, 'users', userId, 'profile', '_');
      const profileListRef = doc(db, 'profiles', userId);
      await setDoc(profileRef, { role: newRole }, { merge: true });
      await setDoc(profileListRef, { role: newRole }, { merge: true });
      toast({
        title: 'התפקיד עודכן',
        description: `התפקיד שונה ל-${newRole === 'admin' ? 'אדמין' : 'משתמש'}`,
      });
      fetchProfiles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן את התפקיד',
        variant: 'destructive',
      });
    }
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const userCount = profiles.filter((p) => p.role === 'user').length;

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">ניהול משתמשים</h1>
          </div>
          <p className="text-muted-foreground mt-1">נהל תפקידי משתמשים והרשאות במערכת</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">סה"כ משתמשים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">אדמינים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{adminCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">משתמשים רגילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">רשימת משתמשים</CardTitle>
            <CardDescription>ניתן לשנות תפקידים ולנהל הרשאות</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead className="hidden sm:table-cell">תאריך הצטרפות</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      אין משתמשים במערכת
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.full_name || 'ללא שם'}
                      </TableCell>
                      <TableCell>{profile.email || 'ללא אימייל'}</TableCell>
                      <TableCell>
                        <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                          {profile.role === 'admin' ? 'אדמין' : 'משתמש'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString('he-IL')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(value: 'user' | 'admin') =>
                            updateUserRole(profile.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">משתמש</SelectItem>
                            <SelectItem value="admin">אדמין</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
