import { useSession } from './lib/session';
import { Stars } from './ui';
import { Join } from './screens/Join';
import { Studio } from './screens/Studio';
import { Reading, Vote, Weaving } from './screens/Live';

export default function App() {
  const phase = useSession((s) => s.phase);
  const toast = useSession((s) => s.toast);

  return (
    <main className="app">
      <Stars />
      {phase === 'join' && <Join />}
      {phase === 'studio' && <Studio />}
      {phase === 'weaving' && <Weaving />}
      {phase === 'reading' && <Reading />}
      {phase === 'vote' && <Vote />}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
