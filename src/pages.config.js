import AboutContentThatMoves from './pages/AboutContentThatMoves';
import AboutStorylines from './pages/AboutStorylines';
import ChapterPreview from './pages/ChapterPreview';
import DocumentManager from './pages/DocumentManager';
import Home from './pages/Home';
import HomeTest from './pages/HomeTest';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import PageEditor from './pages/PageEditor';
import PageTest from './pages/PageTest';
import ProjectInterface from './pages/ProjectInterface';
import Stories from './pages/Stories';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutContentThatMoves": AboutContentThatMoves,
    "AboutStorylines": AboutStorylines,
    "ChapterPreview": ChapterPreview,
    "DocumentManager": DocumentManager,
    "Home": Home,
    "HomeTest": HomeTest,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "PageEditor": PageEditor,
    "PageTest": PageTest,
    "ProjectInterface": ProjectInterface,
    "Stories": Stories,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
    Layout: __Layout,
};