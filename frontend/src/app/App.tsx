import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { Home } from '../pages/Home';
import { Analyze } from '../pages/Analyze';
import { Segments } from '../pages/Segments';
import { Insights } from '../pages/Insights';
import { Methodology } from '../pages/Methodology';
import { About } from '../pages/About';
import { NotFound } from '../pages/NotFound';

export function App() {
  return <Routes><Route element={<AppLayout />}><Route index element={<Home />} /><Route path="analyze" element={<Analyze />} /><Route path="segments" element={<Segments />} /><Route path="insights" element={<Insights />} /><Route path="methodology" element={<Methodology />} /><Route path="about" element={<About />} /><Route path="*" element={<NotFound />} /></Route></Routes>;
}
