import CheatSheetGenerator from './pages/CheatSheetGenerator';
import DocumentGenerator from './pages/DocumentGenerator';
import DocumentTemplates from './pages/DocumentTemplates';
import Home from './pages/Home';
import ManualEditor from './pages/ManualEditor';
import ManualView from './pages/ManualView';
import Manuals from './pages/Manuals';
import SavedDocuments from './pages/SavedDocuments';
import Templates from './pages/Templates';
import Copilot from './pages/Copilot';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CheatSheetGenerator": CheatSheetGenerator,
    "DocumentGenerator": DocumentGenerator,
    "DocumentTemplates": DocumentTemplates,
    "Home": Home,
    "ManualEditor": ManualEditor,
    "ManualView": ManualView,
    "Manuals": Manuals,
    "SavedDocuments": SavedDocuments,
    "Templates": Templates,
    "Copilot": Copilot,
}

export const pagesConfig = {
    mainPage: "Manuals",
    Pages: PAGES,
    Layout: __Layout,
};