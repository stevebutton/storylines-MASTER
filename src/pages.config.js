import ChapterPreview from './pages/ChapterPreview';
import Home from './pages/Home';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import Stories from './pages/Stories';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import HomePageEditor from './pages/HomePageEditor';
import ProjectInterface from './pages/ProjectInterface';
import HomeTest from './pages/HomeTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChapterPreview": ChapterPreview,
    "Home": Home,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "Stories": Stories,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
    "HomePageEditor": HomePageEditor,
    "ProjectInterface": ProjectInterface,
    "HomeTest": HomeTest,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
    Layout: __Layout,
};