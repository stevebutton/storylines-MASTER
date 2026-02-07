/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AboutContentThatMoves from './pages/AboutContentThatMoves';
import AboutStorylines from './pages/AboutStorylines';
import AudioRecorder from './pages/AudioRecorder';
import AudioTest from './pages/AudioTest';
import ChapterPreview from './pages/ChapterPreview';
import DocumentManager from './pages/DocumentManager';
import ExitStory from './pages/ExitStory';
import Home from './pages/Home';
import HomeTest from './pages/HomeTest';
import LocationPickerPage from './pages/LocationPickerPage';
import MediaLibrary from './pages/MediaLibrary';
import MobileStoryCapture from './pages/MobileStoryCapture';
import PageEditor from './pages/PageEditor';
import PageTest from './pages/PageTest';
import ProjectInterface from './pages/ProjectInterface';
import Stories from './pages/Stories';
import StoriesMap from './pages/StoriesMap';
import StoryEditor from './pages/StoryEditor';
import StoryMap from './pages/StoryMap';
import Storyboarder from './pages/Storyboarder';
import StoryMapView from './pages/StoryMapView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AboutContentThatMoves": AboutContentThatMoves,
    "AboutStorylines": AboutStorylines,
    "AudioRecorder": AudioRecorder,
    "AudioTest": AudioTest,
    "ChapterPreview": ChapterPreview,
    "DocumentManager": DocumentManager,
    "ExitStory": ExitStory,
    "Home": Home,
    "HomeTest": HomeTest,
    "LocationPickerPage": LocationPickerPage,
    "MediaLibrary": MediaLibrary,
    "MobileStoryCapture": MobileStoryCapture,
    "PageEditor": PageEditor,
    "PageTest": PageTest,
    "ProjectInterface": ProjectInterface,
    "Stories": Stories,
    "StoriesMap": StoriesMap,
    "StoryEditor": StoryEditor,
    "StoryMap": StoryMap,
    "Storyboarder": Storyboarder,
    "StoryMapView": StoryMapView,
}

export const pagesConfig = {
    mainPage: "ProjectInterface",
    Pages: PAGES,
    Layout: __Layout,
};