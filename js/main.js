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
				var spaceId = pin.getAttribute('data-space');
				openContent(spaceId);
				// remove hover class (showing the title)
				classie.remove(contentItem, 'content__item--hover');
				// highlight the corresponding floor area
				highlightFloorArea(spaceId);
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
				position: { x: 40.29, y: 76.44 }
			},
			'47.0102': { 
				level: 0, 
				position: { x: 43.11, y: 66.75 }
			},
			'47.0101': { 
				level: 0, 
				position: { x: 47.33, y: 74.25 }
			},
			'47.0300': { 
				level: 0, 
				position: { x: 61.52, y: 71.24 }
			},
			'44.0101': { 
				level: 0, 
				position: { x: 21.96, y: 23.55 }
			},
			'47.0000': { 
				level: 0, 
				position: { x: 31.00, y: 75.50 }
			},
			'48.1900': { 
				level: 0, 
				position: { x: 31.48, y: 35.30 }
			},
			'47.1200': { 
				level: 0, 
				position: { x: 40.41, y: 72.45 }
			},
			'43.1300': { 
				level: 0, 
				position: { x: 70.95, y: 50.15 }
			},
			'43.1200': { 
				level: 0, 
				position: { x: 63.57, y: 51.07 }
			},
			'41.1200': { 
				level: 0, 
				position: { x: 34.44, y: 50.18 }
			},
			'48.1000': { 
				level: 0, 
				position: { x: 30.50, y: 46.03 }
			},
			'44.1100': { 
				level: 0, 
				position: { x: 18.23, y: 21.31 }
			},
			'47.1100': { 
				level: 0, 
				position: { x: 60.92, y: 74.45 }
			},
			'42.1101': { 
				level: 0, 
				position: { x: 45.35, y: 24.01 }
			},
			'42.1102': { 
				level: 0, 
				position: { x: 103.54, y: 30.14 }
			},
			'43.1400': { 
				level: 0, 
				position: { x: 65.62, y: 38.11 }
			},
			'40.1900': { 
				level: 0, 
				position: { x: 64.67, y: 58.42 }
			},
			'43.1700': { 
				level: 0, 
				position: { x: 68.30, y: 24.50 }
			},
			'43.1101': { 
				level: 0, 
				position: { x: 106.55, y: 33.38 }
			},
			'41.1100': { 
				level: 0, 
				position: { x: 38.92, y: 52.32 }
			},
			'40.1101': { 
				level: 0, 
				position: { x: 68.92, y: 58.84 }
			},
			'47.1911': { 
				level: 0, 
				position: { x: 54.25, y: 71.10 }
			},
			'40.2902': { 
				level: 0, 
				position: { x: 64.73, y: 58.74 }
			},
			'40.2701': { 
				level: 0, 
				position: { x: 64.11, y: 74.33 }
			},
			'40.2702': { 
				level: 0, 
				position: { x: 93.17, y: 50.08 }
			},
			'40.2703': { 
				level: 0, 
				position: { x: 38.14, y: 62.03 }
			},
			'40.2704': { 
				level: 0, 
				position: { x: 39.00, y: 72.26 }
			},
			'40.2800': { 
				level: 0, 
				position: { x: 69.41, y: 60.76 }
			},
			'43.2103': { 
				level: 0, 
				position: { x: 62.62, y: 51.12 }
			},
			'43.2300': { 
				level: 0, 
				position: { x: 91.96, y: 59.58 }
			},
			'47.2102': { 
				level: 0, 
				position: { x: 105.17, y: 41.79 }
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

	
	// Function to highlight floor areas when pins are clicked
	function highlightFloorArea(spaceId) {
		// First, remove any existing highlights
		const allHighlightedAreas = document.querySelectorAll('.highlighted-area');
		allHighlightedAreas.forEach(area => {
			area.classList.remove('highlighted-area');
		});
		
		// Log the space ID for debugging
		console.log(`Looking for floor area with space ID: ${spaceId}`);
		
		// Find the SVG element with the matching data-space or id attribute
		const levels = document.querySelectorAll('.level');
		let found = false;
		
		levels.forEach(level => {
			// Try different matching strategies
			let area = null;
			
			// Strategy 1: Exact data-space match
			area = level.querySelector(`[data-space="${spaceId}"]`);
			
			// Strategy 2: ID with underscore prefix match
			if (!area) {
				area = level.querySelector(`[id="_${spaceId}"]`);
			}
			
			// Strategy 3: ID equals the space ID
			if (!area) {
				area = level.querySelector(`[id="${spaceId}"]`);
			}
			
			// Strategy 4: Check all IDs that contain the space ID
			if (!area) {
				const possibleAreas = Array.from(level.querySelectorAll('[id]'));
				
				// Sort by ID length to prioritize closer matches
				possibleAreas.sort((a, b) => a.id.length - b.id.length);
				
				for (const possibleArea of possibleAreas) {
					// Check if ID contains the space ID
					if (possibleArea.id.includes(spaceId)) {
						area = possibleArea;
						console.log(`Found area by partial ID match: ${possibleArea.id}`);
						break;
					}
				}
			}
			
			// Strategy 5: Check for data-name attribute
			if (!area) {
				const dataNameElements = level.querySelectorAll('[data-name]');
				for (const element of dataNameElements) {
					if (element.getAttribute('data-name').includes(spaceId)) {
						area = element;
						console.log(`Found area by data-name: ${element.getAttribute('data-name')}`);
						break;
					}
				}
			}
			
			// If an area is found, highlight it
			if (area) {
				console.log(`Highlighting area: ${area.id || area.getAttribute('data-space') || 'unnamed'}`);
				area.classList.add('highlighted-area');
				found = true;
				
				// Make sure the area is visible by scrolling to it if needed
				area.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
		
		// If no area was found, try one more approach with partial class matching
		if (!found) {
			// Look for elements with class names that might contain the space ID
			const allElements = document.querySelectorAll('path, polygon, polyline, rect');
			for (const element of allElements) {
				if (element.id && element.id.includes(spaceId.replace('.', ''))) {
					console.log(`Found area by ID without dots: ${element.id}`);
					element.classList.add('highlighted-area');
					found = true;
					break;
				}
			}
		}
		
		if (!found) {
			console.log(`No matching area found for space ID: ${spaceId}`);
		}
	}
	


})(window);