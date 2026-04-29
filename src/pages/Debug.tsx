import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';

interface DiagResult {
  step: string;
  status: 'ok' | 'error' | 'info';
  data?: unknown;
  error?: string;
}

const Debug = () => {
  const { user, loading } = useAuth();
  const [results, setResults] = useState<DiagResult[]>([]);
  const [running, setRunning] = useState(false);

  const log = (r: DiagResult) => setResults(prev => [...prev, r]);

  const runDiagnostics = async () => {
    setResults([]);
    setRunning(true);

    if (!user) {
      log({ step: 'auth', status: 'error', error: 'not signed in' });
      setRunning(false);
      return;
    }

    log({
      step: 'current user',
      status: 'info',
      data: { uid: user.uid, email: user.email, displayName: user.displayName },
    });

    // 1. Read business_profile
    try {
      const ref = doc(db, 'users', user.uid, 'business_profile', '_');
      const snap = await getDoc(ref);
      log({
        step: 'read business_profile/_',
        status: 'ok',
        data: { path: ref.path, exists: snap.exists(), data: snap.data() ?? null },
      });
    } catch (err) {
      log({
        step: 'read business_profile/_',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // 2. List business_profile collection (might have docs at other IDs)
    try {
      const col = collection(db, 'users', user.uid, 'business_profile');
      const snap = await getDocs(col);
      log({
        step: 'list business_profile collection',
        status: 'ok',
        data: {
          count: snap.size,
          docs: snap.docs.map(d => ({ id: d.id, data: d.data() })),
        },
      });
    } catch (err) {
      log({
        step: 'list business_profile collection',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // 3. Try a write
    try {
      const ref = doc(db, 'users', user.uid, 'business_profile', '_');
      await setDoc(
        ref,
        {
          business_name: 'רם ולסטל ייעוץ עסקי',
          osek_id: '300603362',
          _debug_written_at: new Date().toISOString(),
        },
        { merge: true }
      );
      log({ step: 'write business_profile/_ (merge)', status: 'ok' });
    } catch (err) {
      log({
        step: 'write business_profile/_ (merge)',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // 4. Re-read after write
    try {
      const ref = doc(db, 'users', user.uid, 'business_profile', '_');
      const snap = await getDoc(ref);
      log({
        step: 're-read after write',
        status: 'ok',
        data: { exists: snap.exists(), data: snap.data() ?? null },
      });
    } catch (err) {
      log({
        step: 're-read after write',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // 5. List clients
    try {
      const col = collection(db, 'users', user.uid, 'clients');
      const snap = await getDocs(col);
      log({
        step: 'list clients',
        status: 'ok',
        data: { count: snap.size, names: snap.docs.map(d => d.data().name) },
      });
    } catch (err) {
      log({
        step: 'list clients',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    // 6. List invoices
    try {
      const col = collection(db, 'users', user.uid, 'invoices');
      const snap = await getDocs(col);
      log({
        step: 'list invoices',
        status: 'ok',
        data: { count: snap.size },
      });
    } catch (err) {
      log({
        step: 'list invoices',
        status: 'error',
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }

    setRunning(false);
  };

  useEffect(() => {
    if (!loading && user) runDiagnostics();
  }, [loading, user]);

  const reportText = JSON.stringify(results, null, 2);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    alert('הדו"ח הועתק ללוח. שלח לי את התוכן.');
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Diagnostics</h1>
          <p className="text-muted-foreground text-sm">
            ריצת אבחון על Firestore. שלח את הפלט.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={running}>
            {running ? 'רץ...' : 'הרץ שוב'}
          </Button>
          <Button variant="outline" onClick={copyReport} disabled={results.length === 0}>
            העתק דו"ח JSON
          </Button>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded border text-sm ${
                r.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : r.status === 'ok'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="font-mono font-bold text-xs uppercase">
                [{r.status}] {r.step}
              </div>
              {r.error && (
                <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap">{r.error}</pre>
              )}
              {r.data !== undefined && (
                <pre className="mt-1 text-xs whitespace-pre-wrap" dir="ltr">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Debug;
