import Home from './pages/Home';
import ManualEditor from './pages/ManualEditor';
import ManualView from './pages/ManualView';
import Manuals from './pages/Manuals';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "ManualEditor": ManualEditor,
    "ManualView": ManualView,
    "Manuals": Manuals,
}

export const pagesConfig = {
    mainPage: "Manuals",
    Pages: PAGES,
    Layout: __Layout,
};