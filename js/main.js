/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2016, Codrops
 * http://www.codrops.com
 */
;(function(window) {

	'use strict';

	// helper functions
	// from https://davidwalsh.name/vendor-prefix
	var prefix = (function () {
		var styles = window.getComputedStyle(document.documentElement, ''),
			pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
			dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
		
		return {
			dom: dom,
			lowercase: pre,
			css: '-' + pre + '-',
			js: pre[0].toUpperCase() + pre.substr(1)
		};
	})();
	
	// vars & stuff
	var support = {transitions : Modernizr.csstransitions},
		transEndEventNames = {'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend'},
		transEndEventName = transEndEventNames[Modernizr.prefixed('transition')],
		onEndTransition = function(el, callback, propTest) {
			var onEndCallbackFn = function( ev ) {
				if( support.transitions ) {
					if( ev.target != this || propTest && ev.propertyName !== propTest && ev.propertyName !== prefix.css + propTest ) return;
					this.removeEventListener( transEndEventName, onEndCallbackFn );
				}
				if( callback && typeof callback === 'function' ) { callback.call(this); }
			};
			if( support.transitions ) {
				el.addEventListener( transEndEventName, onEndCallbackFn );
			}
			else {
				onEndCallbackFn();
			}
		},
		// the mall element
		mall = document.querySelector('.mall'),
		// mall´s levels wrapper
		mallLevelsEl = mall.querySelector('.levels'),
		// mall´s levels
		mallLevels = [].slice.call(mallLevelsEl.querySelectorAll('.level')),
		// total levels
		mallLevelsTotal = mallLevels.length,
		// surroundings elems
		mallSurroundings = [].slice.call(mall.querySelectorAll('.surroundings')),
		// selected level position
		selectedLevel,
		// navigation element wrapper
		mallNav = document.querySelector('.mallnav'),
		// show all mall´s levels ctrl
		allLevelsCtrl = mallNav.querySelector('.mallnav__button--all-levels'),
		// levels navigation up/down ctrls
		levelUpCtrl = mallNav.querySelector('.mallnav__button--up'),
		levelDownCtrl = mallNav.querySelector('.mallnav__button--down'),
		// pins
		pins = [].slice.call(mallLevelsEl.querySelectorAll('.pin')),
		// content element
		contentEl = document.querySelector('.content'),
		// content close ctrl
		contentCloseCtrl = null, // We'll set this dynamically when content opens
		// check if a content item is opened
		isOpenContentArea,
		// check if currently animating/navigating
		isNavigating,
		// check if all levels are shown or if one level is shown (expanded)
		isExpanded,
		// spaces list element
		spacesListEl = document.getElementById('spaces-list'),
		// spaces list ul
		spacesEl = spacesListEl.querySelector('ul.list'),
		// all the spaces listed
		spaces = [].slice.call(spacesEl.querySelectorAll('.list__item > a.list__link')),
		// reference to the current shows space (name set in the data-name attr of both the listed spaces and the pins on the map)
		spaceref,
		// sort by ctrls
		sortByNameCtrl = document.querySelector('#sort-by-name'),
		// listjs initiliazation (all mall´s spaces)
		spacesList = new List('spaces-list', { valueNames: ['list__link', { data: ['level'] }, { data: ['category'] } ]} ),

		// smaller screens:
		// open search ctrl
		openSearchCtrl = document.querySelector('button.open-search'),
		// main container
		containerEl = document.querySelector('.container'),
		// close search ctrl
		closeSearchCtrl = spacesListEl.querySelector('button.close-search');

	function init() {
		// init/bind events
		initEvents();
	}

	/**
	 * Initialize/Bind events fn.
	 */
	function initEvents() {
		// click on a Mall´s level
		mallLevels.forEach(function(level, pos) {
			level.addEventListener('click', function() {
				// shows this level
				showLevel(pos+1);
			});
		});

		// click on the show mall´s levels ctrl
		allLevelsCtrl.addEventListener('click', function() {
			// shows all levels
			showAllLevels();
		});

		// navigating through the levels
		levelUpCtrl.addEventListener('click', function() { navigate('Down'); });
		levelDownCtrl.addEventListener('click', function() { navigate('Up'); });

		// sort by name ctrl - add/remove category name (css pseudo element) from list and sorts the spaces by name 
		sortByNameCtrl.addEventListener('click', function() {
			if( this.checked ) {
				classie.remove(spacesEl, 'grouped-by-category');
				spacesList.sort('list__link');
			}
			else {
				classie.add(spacesEl, 'grouped-by-category'); 
				spacesList.sort('category');
			}
		});

		// hovering a pin / clicking a pin
		pins.forEach(function(pin) {
			var contentItem = contentEl.querySelector('.content__item[data-space="' + pin.getAttribute('data-space') + '"]');

			pin.addEventListener('mouseenter', function() {
				if( !isOpenContentArea ) {
					classie.add(contentItem, 'content__item--hover');
				}
			});
			pin.addEventListener('mouseleave', function() {
				if( !isOpenContentArea ) {
					classie.remove(contentItem, 'content__item--hover');
				}
			});
			pin.addEventListener('click', function(ev) {
				ev.preventDefault();
				// open content for this pin
				openContent(pin.getAttribute('data-space'));
				// remove hover class (showing the title)
				classie.remove(contentItem, 'content__item--hover');
			});
		});

		// Add close buttons to all content items and attach event listeners
		var contentItems = document.querySelectorAll('.content__item');
		contentItems.forEach(function(item) {
			// Check if this item already has a close button
			if (!item.querySelector('.content__close-btn')) {
				// Create close button
				var closeBtn = document.createElement('button');
				closeBtn.className = 'boxbutton boxbutton--dark content__close-btn';
				closeBtn.setAttribute('aria-label', 'Close content');
				closeBtn.innerHTML = '<svg class="icon icon--cross"><use xlink:href="#icon-cross"></use></svg>';
				
				// Add event listener
				closeBtn.addEventListener('click', function() {
					closeContentArea();
				});
				
				// Add to content item as first child
				item.insertBefore(closeBtn, item.firstChild);
			}
		});
		
		// Also add event listeners to any existing close buttons
		var closeButtons = document.querySelectorAll('.content__close-btn');
		closeButtons.forEach(function(btn) {
			// Make sure it has an event listener
			btn.addEventListener('click', function() {
				closeContentArea();
			});
		});

		// clicking on a listed space: open level - shows space
		spaces.forEach(function(space) {
			var spaceItem = space.parentNode,
				level = spaceItem.getAttribute('data-level'),
				spacerefval = spaceItem.getAttribute('data-space');

			space.addEventListener('click', function(ev) {
				ev.preventDefault();
				// for smaller screens: close search bar
				closeSearch();
				// open level
				showLevel(level);
				// open content for this space
				openContent(spacerefval);
			});
		});

		// smaller screens: open the search bar
		if (openSearchCtrl) {
			// Use touchstart for better mobile responsiveness
			openSearchCtrl.addEventListener('touchstart', function(ev) {
				ev.preventDefault();
				openSearch();
			});

			// Fallback to click for desktop
			openSearchCtrl.addEventListener('click', function(ev) {
				ev.preventDefault();
				openSearch();
			});

			// Ensure the button is properly initialized
			openSearchCtrl.style.pointerEvents = 'auto';
		}

		// smaller screens: close the search bar
		if (closeSearchCtrl) {
			// Use touchstart for better mobile responsiveness
			closeSearchCtrl.addEventListener('touchstart', function(ev) {
				ev.preventDefault();
				closeSearch();
			});

			// Fallback to click for desktop
			closeSearchCtrl.addEventListener('click', function(ev) {
				ev.preventDefault();
				closeSearch();
			});

			// Ensure the button is properly initialized
			closeSearchCtrl.style.pointerEvents = 'auto';
		}
	}

	/**
	 * Opens a level. The current level moves to the center while the other ones move away.
	 */
	function showLevel(level) {
		if( isExpanded ) {
			return false;
		}
		
		// update selected level val
		selectedLevel = level;

		// control navigation controls state
		setNavigationState();

		classie.add(mallLevelsEl, 'levels--selected-' + selectedLevel);
		
		// Ensure selectedLevel is at least 1 to prevent negative array index
		if (selectedLevel < 1) {
			selectedLevel = 1;
		}
		
		// the level element (array is 0-indexed, but levels are 1-indexed)
		var levelEl = mallLevels[selectedLevel - 1];
		// Check if level element exists before using it
		if (!levelEl) {
			console.warn('Level ' + selectedLevel + ' does not exist');
			return false;
		}
		classie.add(levelEl, 'level--current');

		onEndTransition(levelEl, function() {
			classie.add(mallLevelsEl, 'levels--open');

			// show level pins
			showPins();

			isExpanded = true;
		}, 'transform');
		
		// hide surroundings element
		hideSurroundings();
		
		// show mall nav ctrls
		showMallNav();

		// filter the spaces for this level
		showLevelSpaces();
	}

	/**
	 * Shows all Mall´s levels
	 */
	function showAllLevels() {
		if( isNavigating || !isExpanded ) {
			return false;
		}
		isExpanded = false;

		classie.remove(mallLevels[selectedLevel - 1], 'level--current');
		classie.remove(mallLevelsEl, 'levels--selected-' + selectedLevel);
		classie.remove(mallLevelsEl, 'levels--open');

		// hide level pins
		removePins();

		// shows surrounding element
		showSurroundings();
		
		// hide mall nav ctrls
		hideMallNav();

		// show back the complete list of spaces
		spacesList.filter();

		// close content area if it is open
		if( isOpenContentArea ) {
			closeContentArea();
		}
	}

	/**
	 * Shows all spaces for current level
	 */
	function showLevelSpaces() {
		spacesList.filter(function(item) { 
			// selectedLevel is 1-indexed, but data-level is 0-indexed for Level_0, 1-indexed for Level_1, etc.
			// So we need to subtract 1 from selectedLevel to match the data-level values
			return item.values().level === (selectedLevel - 1).toString(); 
		});
	}

	/**
	 * Shows the level´s pins
	 */
	function showPins(levelEl) {
		var levelEl = levelEl || mallLevels[selectedLevel === 0 ? 0 : selectedLevel - 1];
		classie.add(levelEl.querySelector('.level__pins'), 'level__pins--active');
	}

	/**
	 * Removes the level´s pins
	 */
	function removePins(levelEl) {
		var levelEl = levelEl || mallLevels[selectedLevel - 1];
		classie.remove(levelEl.querySelector('.level__pins'), 'level__pins--active');
	}

	/**
	 * Show the navigation ctrls
	 */
	function showMallNav() {
		classie.remove(mallNav, 'mallnav--hidden');
	}

	/**
	 * Hide the navigation ctrls
	 */
	function hideMallNav() {
		classie.add(mallNav, 'mallnav--hidden');
	}

	/**
	 * Show the surroundings level
	 */
	function showSurroundings() {
		mallSurroundings.forEach(function(el) {
			classie.remove(el, 'surroundings--hidden');
		});
	}

	/**
	 * Hide the surroundings level
	 */
	function hideSurroundings() {
		mallSurroundings.forEach(function(el) {
			classie.add(el, 'surroundings--hidden');
		});
	}

	/**
	 * Navigate through the mall´s levels
	 */
	function navigate(direction) {
		// Allow navigation even when content is open by removing the isOpenContentArea check
		if( isNavigating || !isExpanded ) {
			return false;
		}
		isNavigating = true;

		var prevSelectedLevel = selectedLevel;

		// current level
		var currentLevel = mallLevels[prevSelectedLevel-1];

		if( direction === 'Up' && prevSelectedLevel > 1 ) {
			--selectedLevel;
		}
		else if( direction === 'Down' && prevSelectedLevel < mallLevelsTotal ) {
			++selectedLevel;
		}
		else {
			isNavigating = false;	
			return false;
		}

		// control navigation controls state (enabled/disabled)
		setNavigationState();
		// transition direction class
		classie.add(currentLevel, 'level--moveOut' + direction);
		// next level element
		var nextLevel = mallLevels[selectedLevel-1]
		// ..becomes the current one
		classie.add(nextLevel, 'level--current');

		// when the transition ends..
		onEndTransition(currentLevel, function() {
			classie.remove(currentLevel, 'level--moveOut' + direction);
			// solves rendering bug for the SVG opacity-fill property
			setTimeout(function() {classie.remove(currentLevel, 'level--current');}, 60);

			classie.remove(mallLevelsEl, 'levels--selected-' + prevSelectedLevel);
			classie.add(mallLevelsEl, 'levels--selected-' + selectedLevel);

			// show the current level´s pins
			showPins();

			isNavigating = false;
		});

		// filter the spaces for this level
		showLevelSpaces();

		// hide the previous level´s pins
		removePins(currentLevel);
	}

	/**
	 * Control navigation ctrls state. Add disable class to the respective ctrl when the current level is either the first or the last.
	 */
	function setNavigationState() {
		if( selectedLevel == 1 ) {
			classie.add(levelDownCtrl, 'boxbutton--disabled');
		}
		else {
			classie.remove(levelDownCtrl, 'boxbutton--disabled');
		}

		if( selectedLevel == mallLevelsTotal ) {
			classie.add(levelUpCtrl, 'boxbutton--disabled');
		}
		else {
			classie.remove(levelUpCtrl, 'boxbutton--disabled');
		}
	}

	/**
	 * Opens/Reveals a content item.
	 */
	function openContent(spacerefval) {
		// if one already shown:
		if( isOpenContentArea ) {
			hideSpace();
			spaceref = spacerefval;
			showSpace();
		}
		else {
			spaceref = spacerefval;
			openContentArea();
		}
		
		// remove class active (if any) from current list item
		var activeItem = spacesEl.querySelector('li.list__item--active');
		if( activeItem ) {
			classie.remove(activeItem, 'list__item--active');
		}
		// list item gets class active
		var listItem = spacesEl.querySelector('li[data-space="' + spacerefval + '"]');
		if (listItem) {
			classie.add(listItem, 'list__item--active');
		}

		// Check if the selected level exists
		if (mallLevels[selectedLevel - 1]) {
			// remove class selected (if any) from current space
			var activeSpaceArea = mallLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
			if (activeSpaceArea) {
				classie.remove(activeSpaceArea, 'map__space--selected');
			}
			
			// svg area gets selected - only if it exists
			var spaceToSelect = mallLevels[selectedLevel - 1].querySelector('svg > .map__space[data-space="' + spaceref + '"]');
			if (spaceToSelect) {
				classie.add(spaceToSelect, 'map__space--selected');
			}
		}
	}

	/**
	 * Opens the content area.
	 */
	function openContentArea() {
		isOpenContentArea = true;
		// shows space
		showSpace(true);
		// No need to show/hide close button as it's part of the content item
		// resize mall area
		classie.add(mall, 'mall--content-open');
		// Keep navigation controls accessible instead of disabling them
		// This allows users to navigate between levels even when content is open
		setNavigationState();
	}

	/**
	 * Shows a space.
	 */
	function showSpace(sliding) {
		// the content item
		var contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
		// show content
		classie.add(contentItem, 'content__item--current');
		if( sliding ) {
			onEndTransition(contentItem, function() {
				classie.add(contentEl, 'content--open');
			});
		}
		// map pin gets selected
		classie.add(mallLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]'), 'pin--active');
	}

	/**
	 * Closes the content area.
	 */
	function closeContentArea() {
		classie.remove(contentEl, 'content--open');
		// close current space
		hideSpace();
		// hide close ctrl - only if it exists
		if (contentCloseCtrl) {
			classie.add(contentCloseCtrl, 'content__button--hidden');
		}
		// resize mall area
		classie.remove(mall, 'mall--content-open');
		// enable mall nav ctrls
		if( isExpanded ) {
			setNavigationState();
		}
		isOpenContentArea = false;
	}

	/**
	 * Hides a space.
	 */
	function hideSpace() {
		// the content item
		var contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
		// hide content
		classie.remove(contentItem, 'content__item--current');
		// map pin gets unselected
		classie.remove(mallLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]'), 'pin--active');
		// remove class active (if any) from current list item
		var activeItem = spacesEl.querySelector('li.list__item--active');
		if( activeItem ) {
			classie.remove(activeItem, 'list__item--active');
		}
		// remove class selected (if any) from current space
		var activeSpaceArea = mallLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
		if( activeSpaceArea ) {
			classie.remove(activeSpaceArea, 'map__space--selected');
		}
	}

	/**
	 * for smaller screens: open search bar
	 */
	function openSearch() {
		// shows all levels - we want to show all the spaces for smaller screens 
		showAllLevels();

		// Force a reflow to ensure CSS transitions work properly
		void spacesListEl.offsetWidth;

		// Add classes to show the search menu
		classie.add(spacesListEl, 'spaces-list--open');
		classie.add(containerEl, 'container--overflow');
		
		// Ensure the search input is focused for better UX
		setTimeout(function() {
			var searchInput = spacesListEl.querySelector('.search__input');
			if (searchInput) {
				searchInput.focus();
			}
		}, 300);
	}

	/**
	 * for smaller screens: close search bar
	 */
	function closeSearch() {
		// Force a reflow to ensure CSS transitions work properly
		void spacesListEl.offsetWidth;

		// Remove classes to hide the search menu
		classie.remove(spacesListEl, 'spaces-list--open');
		classie.remove(containerEl, 'container--overflow');
		
		// Blur any focused elements
		if (document.activeElement) {
			document.activeElement.blur();
		}
	}
	
	// Function to manually align pins with their SVG elements
	function positionPinsByDataSpace() {
		// We'll use a simpler approach that's more reliable
		console.log('Running pin positioning...');
		
		// Find all SVG elements with IDs that contain data-space values
		const findSvgElementsWithDataSpace = () => {
			// Create a mapping of data-space values to SVG element IDs
			const dataSpaceToIdMap = {};
			
			// Process each level
			for (let level = 0; level <= 2; level++) {
				const levelSvg = document.querySelector(`.level--${level+1} svg`);
				if (!levelSvg) continue;
				
				// Find all elements with IDs in the SVG
				const elements = levelSvg.querySelectorAll('[id]');
				
				elements.forEach(el => {
					const id = el.id;
					// Look for IDs that contain data-space values (like _40.2902_L2_Bathroom)
					const match = id.match(/_(\d+\.\d+)/);
					if (match && match[1]) {
						const dataSpace = match[1];
						dataSpaceToIdMap[dataSpace] = { element: el, level };
					}
				});
			}
			
			return dataSpaceToIdMap;
		};
		
		// Get the mapping
		const dataSpaceMap = findSvgElementsWithDataSpace();
		console.log('Data space map:', Object.keys(dataSpaceMap));
		
		// Manual mappings for all pins based on user adjustments
		const manualMappings = {
			'40.0900': { 
				level: 0, // Level 0 (index is 0-based, so this is level 1 in the UI)
				position: { x: 39.09, y: 60.28 }
			},
			'47.0100': { 
				level: 0, 
				position: { x: 40.79, y: 74.94 }
			},
			'47.0102': { 
				level: 0, 
				position: { x: 39.61, y: 69.25 }
			},
			'47.0101': { 
				level: 0, 
				position: { x: 45.33, y: 74.75 }
			},
			'47.0300': { 
				level: 0, 
				position: { x: 63.02, y: 69.24 }
			},
			'44.0101': { 
				level: 0, 
				position: { x: 21.96, y: 23.55 }
			},
			'47.0000': { 
				level: 0, 
				position: { x: 32.00, y: 75.00 }
			},
			'48.1900': { 
				level: 0, 
				position: { x: 31.48, y: 35.30 }
			},
			'47.1200': { 
				level: 0, 
				position: { x: 43.41, y: 62.45 }
			},
			'43.1300': { 
				level: 0, 
				position: { x: 62.45, y: 52.65 }
			},
			'43.1200': { 
				level: 0, 
				position: { x: 67.07, y: 26.07 }
			},
			'41.1200': { 
				level: 0, 
				position: { x: 35.44, y: 49.68 }
			},
			'48.1000': { 
				level: 0, 
				position: { x: 30.50, y: 46.03 }
			},
			'44.1100': { 
				level: 0, 
				position: { x: 17.73, y: 18.31 }
			},
			'47.1100': { 
				level: 0, 
				position: { x: 62.42, y: 69.95 }
			},
			'42.1101': { 
				level: 0, 
				position: { x: 40.85, y: 24.51 }
			},
			'42.1102': { 
				level: 0, 
				position: { x: 47.04, y: 23.14 }
			},
			'43.1400': { 
				level: 0, 
				position: { x: 66.62, y: 38.11 }
			},
			'40.1900': { 
				level: 0, 
				position: { x: 65.17, y: 58.92 }
			},
			'1.13': { 
				level: 0, 
				position: { x: 50.00, y: 50.00 }
			},
			'43.1101': { 
				level: 0, 
				position: { x: 69.95, y: 55.38 }
			},
			'41.1100': { 
				level: 0, 
				position: { x: 38.92, y: 52.32 }
			},
			'40.1101': { 
				level: 0, 
				position: { x: 70.42, y: 57.34 }
			},
			'47.1911': { 
				level: 0, 
				position: { x: 54.25, y: 70.60 }
			},
			'40.2902': { 
				level: 0, 
				position: { x: 72.23, y: 24.24 }
			},
			'40.2701': { 
				level: 0, 
				position: { x: 42.11, y: 71.83 }
			},
			'40.2702': { 
				level: 0, 
				position: { x: 43.17, y: 60.08 }
			},
			'40.2703': { 
				level: 0, 
				position: { x: 59.64, y: 61.53 }
			},
			'40.2704': { 
				level: 0, 
				position: { x: 61.50, y: 72.76 }
			},
			'40.2800': { 
				level: 0, 
				position: { x: 70.41, y: 53.76 }
			},
			'43.2103': { 
				level: 0, 
				position: { x: 65.12, y: 44.62 }
			},
			'43.2300': { 
				level: 0, 
				position: { x: 63.46, y: 51.58 }
			},
			'47.2102': { 
				level: 0, 
				position: { x: 50.17, y: 23.79 }
			},
			'49.2100': { 
				level: 0, 
				position: { x: 18.72, y: 16.82 }
			}
		};
		
		// Now find all pins and position them based on their data-space values
		const pins = document.querySelectorAll('.pin[data-space]');
		console.log(`Found ${pins.length} pins with data-space attributes`);
		
		// Since we now have manual mappings for all pins, we can simplify the positioning logic
		pins.forEach(pin => {
			const dataSpace = pin.getAttribute('data-space');
			if (!dataSpace) return;
			
			// Apply the manual position if available
			if (manualMappings[dataSpace]) {
				const { position } = manualMappings[dataSpace];
				
				// Apply the manual position
				pin.style.left = `${position.x}vmin`;
				pin.style.top = `${position.y}vmin`;
				
				console.log(`Positioned pin for ${dataSpace} at ${position.x}vmin, ${position.y}vmin`);
			} else {
				console.log(`No manual mapping found for data-space: ${dataSpace}`);
			}
		});
	}

	// Call the function after initialization
	init();
	// Position pins after a short delay to ensure the DOM is fully loaded
	setTimeout(positionPinsByDataSpace, 500);
	
	// Add pin adjustment tool
	setTimeout(addPinAdjustmentTool, 1000);
	
	// Function to enable manual pin adjustment in the browser
	function addPinAdjustmentTool() {
		// Create UI controls for adjustment mode
		const controlPanel = document.createElement('div');
		controlPanel.style.position = 'fixed';
		controlPanel.style.top = '10px';
		controlPanel.style.right = '10px';
		controlPanel.style.zIndex = '9999';
		controlPanel.style.background = 'rgba(255, 255, 255, 0.9)';
		controlPanel.style.padding = '10px';
		controlPanel.style.borderRadius = '5px';
		controlPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
		controlPanel.style.display = 'none'; // Hidden by default
		
		// Toggle button to show/hide the control panel
		const toggleButton = document.createElement('button');
		toggleButton.textContent = 'Pin Adjustment Mode';
		toggleButton.style.position = 'fixed';
		toggleButton.style.top = '10px';
		toggleButton.style.right = '10px';
		toggleButton.style.zIndex = '10000';
		toggleButton.style.padding = '5px 10px';
		toggleButton.style.background = '#007bff';
		toggleButton.style.color = 'white';
		toggleButton.style.border = 'none';
		toggleButton.style.borderRadius = '3px';
		toggleButton.style.cursor = 'pointer';
		
		// Add controls to the panel
		controlPanel.innerHTML = `
			<h3 style="margin-top: 0;">Pin Adjustment Tool</h3>
			<p>Click on a pin to select it, then use arrow keys to move it:</p>
			<ul>
				<li>Arrow keys: Move 0.5vmin</li>
				<li>Shift + Arrow keys: Move 0.1vmin</li>
				<li>Ctrl + Arrow keys: Move 2vmin</li>
			</ul>
			<p>Selected pin: <span id="selected-pin-info">None</span></p>
			<p>Position: <span id="pin-position">-</span></p>
			<button id="save-positions">Save Positions to Console</button>
		`;
		
		// Add elements to the document
		document.body.appendChild(toggleButton);
		document.body.appendChild(controlPanel);
		
		// Toggle the control panel
		toggleButton.addEventListener('click', function() {
			if (controlPanel.style.display === 'none') {
				controlPanel.style.display = 'block';
				enablePinAdjustment();
				toggleButton.textContent = 'Exit Adjustment Mode';
			} else {
				controlPanel.style.display = 'none';
				disablePinAdjustment();
				toggleButton.textContent = 'Pin Adjustment Mode';
			}
		});
		
		// Save button functionality
		const saveButton = controlPanel.querySelector('#save-positions');
		saveButton.addEventListener('click', function() {
			savePinPositions();
		});
		
		// Variables to track state
		let selectedPin = null;
		let adjustmentEnabled = false;
		
		// Enable pin adjustment
		function enablePinAdjustment() {
			adjustmentEnabled = true;
			
			// Add click handlers to all pins
			const pins = document.querySelectorAll('.pin');
			pins.forEach(pin => {
				pin.style.cursor = 'pointer';
				pin.addEventListener('click', selectPin);
			});
			
			// Add keyboard handler
			document.addEventListener('keydown', handleKeyPress);
		}
		
		// Disable pin adjustment
		function disablePinAdjustment() {
			adjustmentEnabled = false;
			
			// Remove click handlers from pins
			const pins = document.querySelectorAll('.pin');
			pins.forEach(pin => {
				pin.style.cursor = '';
				pin.removeEventListener('click', selectPin);
				pin.style.outline = '';
			});
			
			// Remove keyboard handler
			document.removeEventListener('keydown', handleKeyPress);
			
			// Clear selection
			selectedPin = null;
			updateSelectedPinInfo();
		}
		
		// Handle pin selection
		function selectPin(event) {
			// Prevent default behavior and propagation
			event.preventDefault();
			event.stopPropagation();
			
			// Clear previous selection
			if (selectedPin) {
				selectedPin.style.outline = '';
			}
			
			// Set new selection
			selectedPin = this;
			selectedPin.style.outline = '2px solid red';
			
			// Update info display
			updateSelectedPinInfo();
			
			return false;
		}
		
		// Handle keyboard input for moving pins
		function handleKeyPress(event) {
			if (!selectedPin || !adjustmentEnabled) return;
			
			// Get current position
			let left = parseFloat(selectedPin.style.left) || 0;
			let top = parseFloat(selectedPin.style.top) || 0;
			
			// Determine movement amount based on modifier keys
			let moveAmount = 0.5; // Default movement amount (vmin)
			
			if (event.shiftKey) {
				moveAmount = 0.1; // Fine adjustment
			} else if (event.ctrlKey) {
				moveAmount = 2; // Large adjustment
			}
			
			// Apply movement based on arrow key
			switch (event.key) {
				case 'ArrowLeft':
					left -= moveAmount;
					event.preventDefault();
					break;
				case 'ArrowRight':
					left += moveAmount;
					event.preventDefault();
					break;
				case 'ArrowUp':
					top -= moveAmount;
					event.preventDefault();
					break;
				case 'ArrowDown':
					top += moveAmount;
					event.preventDefault();
					break;
				default:
					return; // Not an arrow key, do nothing
			}
			
			// Update pin position
			selectedPin.style.left = `${left}vmin`;
			selectedPin.style.top = `${top}vmin`;
			
			// Update info display
			updateSelectedPinInfo();
		}
		
		// Update the display of selected pin info
		function updateSelectedPinInfo() {
			const infoSpan = document.getElementById('selected-pin-info');
			const positionSpan = document.getElementById('pin-position');
			
			if (selectedPin) {
				const dataSpace = selectedPin.getAttribute('data-space') || 'Unknown';
				const left = parseFloat(selectedPin.style.left) || 0;
				const top = parseFloat(selectedPin.style.top) || 0;
				
				infoSpan.textContent = dataSpace;
				positionSpan.textContent = `left: ${left.toFixed(2)}vmin, top: ${top.toFixed(2)}vmin`;
			} else {
				infoSpan.textContent = 'None';
				positionSpan.textContent = '-';
			}
		}
		
		// Save all pin positions to console
		function savePinPositions() {
			const pins = document.querySelectorAll('.pin[data-space]');
			const positions = {};
			
			pins.forEach(pin => {
				const dataSpace = pin.getAttribute('data-space');
				if (!dataSpace) return;
				
				const left = parseFloat(pin.style.left) || 0;
				const top = parseFloat(pin.style.top) || 0;
				
				positions[dataSpace] = { left, top };
			});
			
			// Format as JavaScript object for easy copy-paste
			const formattedPositions = JSON.stringify(positions, null, 2);
			console.log('Pin Positions:');
			console.log(formattedPositions);
			
			// Also format as manualMappings object
			let manualMappingsCode = 'const manualMappings = {\n';
			for (const [dataSpace, pos] of Object.entries(positions)) {
				manualMappingsCode += `\t'${dataSpace}': { \n\t\tlevel: 0, // Update level as needed\n\t\tposition: { x: ${pos.left.toFixed(2)}, y: ${pos.top.toFixed(2)} }\n\t},\n`;
			}
			manualMappingsCode += '};';
			
			console.log('\nManual Mappings Format:');
			console.log(manualMappingsCode);
			
			alert('Pin positions saved to console! Press F12 to view and copy them.');
		}
	}

})(window);