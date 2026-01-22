import ChapterPreview from './pages/ChapterPreview';
import Home from './pages/Home';
import HomeTest from './pages/HomeTest';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import ProjectInterface from './pages/ProjectInterface';
import Stories from './pages/Stories';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import PageEditor from './pages/PageEditor';
import PageTest from './pages/PageTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChapterPreview": ChapterPreview,
    "Home": Home,
    "HomeTest": HomeTest,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "ProjectInterface": ProjectInterface,
    "Stories": Stories,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
    "PageEditor": PageEditor,
    "PageTest": PageTest,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
    Layout: __Layout,
};