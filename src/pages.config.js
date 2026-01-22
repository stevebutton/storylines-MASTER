import ChapterPreview from './pages/ChapterPreview';
import Home from './pages/Home';
import HomePageEditor from './pages/HomePageEditor';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import projectinterfaceBackup from './pages/ProjectInterface.backup';
import ProjectInterface from './pages/ProjectInterface';
import Stories from './pages/Stories';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import StoryMapView from './pages/StoryMapView';
import Reference from './pages/Reference';
import ReferenceHome from './pages/ReferenceHome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChapterPreview": ChapterPreview,
    "Home": Home,
    "HomePageEditor": HomePageEditor,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "ProjectInterface.backup": projectinterfaceBackup,
    "ProjectInterface": ProjectInterface,
    "Stories": Stories,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "StoryMapView": StoryMapView,
    "Reference": Reference,
    "ReferenceHome": ReferenceHome,
}

export const pagesConfig = {
    mainPage: "StoryMap",
    Pages: PAGES,
    Layout: __Layout,
};