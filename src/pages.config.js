import DocumentGenerator from './pages/DocumentGenerator';
import DocumentTemplates from './pages/DocumentTemplates';
import Home from './pages/Home';
import ManualEditor from './pages/ManualEditor';
import ManualView from './pages/ManualView';
import Manuals from './pages/Manuals';
import Templates from './pages/Templates';
import CheatSheetGenerator from './pages/CheatSheetGenerator';
import SavedDocuments from './pages/SavedDocuments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "DocumentGenerator": DocumentGenerator,
    "DocumentTemplates": DocumentTemplates,
    "Home": Home,
    "ManualEditor": ManualEditor,
    "ManualView": ManualView,
    "Manuals": Manuals,
    "Templates": Templates,
    "CheatSheetGenerator": CheatSheetGenerator,
    "SavedDocuments": SavedDocuments,
}

export const pagesConfig = {
    mainPage: "Manuals",
    Pages: PAGES,
    Layout: __Layout,
};