import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import InputView from './views/InputView.jsx';
import ResultsView from './views/ResultsView.jsx';
import DetailView from './views/DetailView.jsx';
import SavedView from './views/SavedView.jsx';
import AccountView from './views/AccountView.jsx';

/** Route table. Each view is its own screen — never everything on one page. */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<InputView />} />
        <Route path="/results" element={<ResultsView />} />
        <Route path="/listing/:id" element={<DetailView />} />
        <Route path="/saved" element={<SavedView />} />
        <Route path="/account" element={<AccountView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
