import CheatSheetGenerator from './pages/CheatSheetGenerator';
import Copilot from './pages/Copilot';
import Dashboard from './pages/Dashboard';
import DocumentGenerator from './pages/DocumentGenerator';
import DocumentTemplates from './pages/DocumentTemplates';
import Home from './pages/Home';
import ManualEditor from './pages/ManualEditor';
import ManualView from './pages/ManualView';
import Manuals from './pages/Manuals';
import SavedDocuments from './pages/SavedDocuments';
import Templates from './pages/Templates';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CheatSheetGenerator": CheatSheetGenerator,
    "Copilot": Copilot,
    "Dashboard": Dashboard,
    "DocumentGenerator": DocumentGenerator,
    "DocumentTemplates": DocumentTemplates,
    "Home": Home,
    "ManualEditor": ManualEditor,
    "ManualView": ManualView,
    "Manuals": Manuals,
    "SavedDocuments": SavedDocuments,
    "Templates": Templates,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};