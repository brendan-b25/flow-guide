import Home from './pages/Home';
import ManualEditor from './pages/ManualEditor';
import ManualView from './pages/ManualView';
import Manuals from './pages/Manuals';
import Templates from './pages/Templates';
import DocumentGenerator from './pages/DocumentGenerator';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "ManualEditor": ManualEditor,
    "ManualView": ManualView,
    "Manuals": Manuals,
    "Templates": Templates,
    "DocumentGenerator": DocumentGenerator,
}

export const pagesConfig = {
    mainPage: "Manuals",
    Pages: PAGES,
    Layout: __Layout,
};