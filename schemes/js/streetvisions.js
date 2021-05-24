// Streetvisions implementation code

/*jslint browser: true, white: true, single: true, for: true, long: true */
/*global $, alert, console, window, jQuery, L, Tipped */

var streetvisions = (function ($) {
	
	'use strict';
	
	var _settings = {
		
		// CycleStreets API; obtain a key at https://www.cyclestreets.net/api/apply/
		cyclestreetsApiBaseUrl: 'https://api.cyclestreets.net',
		cyclestreetsApiKey: 'YOUR_API_KEY',

		// Geocoder API URL; re-use of settings values represented as placeholders {%cyclestreetsApiBaseUrl}, {%cyclestreetsApiKey}, {%autocompleteBbox}, are supported
		geocoderApiUrl: '{%cyclestreetsApiBaseUrl}/v2/geocoder?key={%cyclestreetsApiKey}&bounded=1&bbox={%autocompleteBbox}',
		
		// BBOX for autocomplete results biasing
		autocompleteBbox: '-6.6577,49.9370,1.7797,57.6924',
		
		// Initial map location
		defaultLatitude: false,
		defaultLongitude: false,
		defaultZoom: false,
		
		// Tiles
		tileUrl: false,
		
		// Data
		geojsonData: {}
	};

	// Properties/state
	var _initialToolPosition = null; // Store the initial dragged position of a tool
	var _draggedTool = null; // Div of the tool being dragged
	var _draggedToolObject = null; // Object containing information about the tool being dragged
	var _map; // Class property Leaflet map
	var _leafletMarkers = []; // User-added map markers
	
	// Definitions
	var _toolboxObjects = [
		{
			type: 'cycleParking', 
			description: 'A parking area for bicycles.',
			groups: 'cycling',
			icon: 'fa-parking',
			colour: '#069BED'
		},
		{
			type: 'seating', 
			description: 'Public outdoor seating, like a bench or seat.',
			groups: 'walking',
			icon: 'fa-chair',
			colour: '#1A8D8A'
		},
		{
			type: 'parklet', 
			description: 'A parklet is a sidewalk extension that provides more space and amenities for people using the street. Usually parklets are installed on parking lanes and use several parking spaces. Parklets typically extend out from the sidewalk at the level of the sidewalk to the width of the adjacent parking space.',
			groups: 'walking',
			icon: 'fa-tshirt',
			colour: '#27824C'
		},
		{
			type: 'cycleLane', 
			description: 'A lane for bicycles.',
			groups: 'cycling',
			icon: 'fa-road',
			colour: '#433C96'
		},
		{
			type: 'pointClosure', 
			description: 'Stop through-traffic to open up the space for cycling and walking',
			groups: ['driving', 'cycling'],
			icon: 'fa-hand-paper',
			colour: '#D52506'
		},
		{
			type: 'carParking', 
			description: 'Parking space or spaces for cars.',
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#3D6B94'
		},
		{
			type: 'deliveryBay', 
			description: 'A delivery bay is a space where delivery vehicles can temporarily park while engaging in deliveries, without blocking the pavement.',
			groups: ['driving', 'walking'],
			icon: 'fa-truck',
			colour: '#42268C'
		},
		{
			type: 'chargingPoint', 
			description: 'A charging station for vehicles.',
			groups: ['cycling', 'driving'],
			icon: 'fa-plug',
			colour: '#A745A5'
		},
		{
			type: 'trafficCalming', 
			description: 'A device like a road hump, that causes traffic to slow.',
			groups: 'driving',
			icon: 'fa-traffic-light',
			colour: '#B13110'
		},
		{
			type: 'plantingArea', 
			description: 'Small area for greenery',
			groups: ['walking', 'nature'],
			icon: 'fa-seedling',
			colour: '#83AD1F'
		},
		{
			type: 'tree',
			description: '',
			groups: ['walking', 'nature'],
			icon: 'fa-tree',
			colour: '#82CA13'
		},
		{
			type: 'pavementImprovement', 
			description: '',
			groups: 'pedestrians',
			icon: 'fa-walking',
			colour: '#1AA8D0'
		},
		{
			type: 'crossing', 
			description: 'Pedestrian crossing',
			groups: 'pedestrians',
			icon: 'fa-traffic-light',
			colour: '#1650A7'
		},
		{
			type: 'playArea', 
			description: '',
			groups: 'pedestrians',
			icon: 'fa-snowman',
			colour: '#1CBF22'
		},
		{
			type:'cafeSpace', 
			description: 'External seating and tables for nearby café/restaurant.',
			groups: 'walking',
			icon: 'fa-coffee',
			colour: '#0B986B'
		},
		{
			type: 'parkingRestriction', 
			description: '',
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#DB9020'
		},
		{
			type: 'bollard', 
			description: '',
			groups: ['driving', 'cycling'],
			icon: 'fa-car-crash',
			colour: '#B13110'
		},
		{
			type: 'disabledParking', 
			description: 'A specially reserved parking space.',
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#2563C5'
		}
	];

	
	return {
		
	// Public functions
		
		// Main function
		initialise: function (config, action)
		{
			// Merge the configuration into the settings
			$.each (_settings, function (setting, value) {
				if (config.hasOwnProperty(setting)) {
					_settings[setting] = config[setting];
				}
			});
			
			// Run action, if defined and existing
			if (action) {
				if (typeof streetvisions[action] === 'function') {
					streetvisions[action] ();
				}
			}
		},
		
		
		// Function to initialise the UI
		schemeslist: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Search
			streetvisions.initSearch ();
			
			// Initialise map for each scheme
			$.each (_settings.geojsonData, function (mapId, boundary) {
				streetvisions.leafletMap (mapId, boundary);
			});
		},
		
		
		visionshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Discussion
			streetvisions.initDiscussion ();

			// Map
			streetvisions.leafletMap ('leaflet', _settings.geojsonData);
		},


		schemeshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Add a map into the specified ID with the specified data
			streetvisions.leafletMap ('map', _settings.geojsonData.scheme);
			
			// Initialise map for each scheme
			$.each (_settings.geojsonData.visions, function (mapId, boundary) {
				streetvisions.leafletMap (mapId, boundary);
			});
		},
		
		
		visionadd: function ()
		{
			// Init modal
			streetvisions.initModal ();
			
			// Populate pretty names, adding these to the definitions
			$.each (_toolboxObjects, function (index, tool) {
				_toolboxObjects[index].prettyName = streetvisions.convertCamelCaseToSentence (tool.type);
			});
			
			// Add toolbox objects from defintion
			streetvisions.populateToolbox ();
			
			// Toolbox drawers
			streetvisions.toolbox ();
			
			// Start Leaflet
			streetvisions.leafletMap ('leaflet', _settings.geojsonData);
			
			// Builder options
			streetvisions.initBuilder ();
		},
		
		
		// Leaflet map
		leafletMap: function (divId, geojsonData)
		{
			// Create a map
			_map = L.map (divId).setView ([_settings.defaultLatitude, _settings.defaultLongitude], _settings.defaultZoom);
			
			// Add tile background
			L.tileLayer (_settings.tileUrl, {
				attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
			}).addTo (_map);
			
			// Add a layer group to manage dropped tools
			L.layerGroup().addTo (_map);
			
			// Add the GeoJSON to the map
			if (geojsonData) {
				var feature = L.geoJSON (geojsonData).addTo (_map);
				_map.fitBounds (feature.getBounds());
			}
		},
		
		
		// Segmented control
		segmentedControl: function ()
		{
			// Constants
			const SEGMENTED_CONTROL_BASE_SELECTOR = ".ios-segmented-control";
			const SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR = ".ios-segmented-control .option input";
			const SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR = ".ios-segmented-control .selection";
			
			forEachElement (SEGMENTED_CONTROL_BASE_SELECTOR, function (elem) {
				elem.addEventListener ('change', updatePillPosition);
			});
			window.addEventListener ('resize',
				updatePillPosition
			); // Prevent pill from detaching from element when window resized. Becuase this is rare I haven't bothered with throttling the event
			
			function updatePillPosition () {
				forEachElement (SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR, function (elem, index) {
					if (elem.checked) {
						moveBackgroundPillToElement (elem, index);
					}
				});
			}
		
			function moveBackgroundPillToElement (elem, index) {
				document.querySelector (SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR).style.transform = 'translateX(' + (elem.offsetWidth * index) + 'px)';
			}
			
			// Helper functions
			function forEachElement (className, fn) {
				Array.from (document.querySelectorAll (className)).forEach (fn);
			}
		},


		populateToolbox: function ()
		{
			// Iterate through each of the toolbox objects
			var html;
			var toolboxGroup;
			var toolboxOpen;
			var toolboxPrettyName;			
			_toolboxObjects.map (function (tool, i) {
				
				// If groups is a string, convert it into an array
				var groups = (!Array.isArray (tool.groups) ? [tool.groups] : tool.groups);
				
				// Iterate through the groups
				groups.map (function (group) {
					toolboxGroup = $('.toolbox .' + group);
					toolboxPrettyName = streetvisions.capitalizeFirstLetter (group);
					
					// If there is no toolbox-header for this group, add it. 
					if (toolboxGroup.length === 0) {
						// If this is the first toolbox group, have it open by default
						toolboxOpen = ($('.toolbox-header').length == 0 ? 'toolbox-open' : '');
						
						// Build the HTML for the toolbox drawer
						html = '';
						html += `<div class="toolbox-header ${group} ${toolboxOpen}">`;
						html += '<i class="fa fa-chevron-down"></i>';
						html +=	`<h5>${toolboxPrettyName}</h5>`;
						html += '<div class="group-contents"><ul></ul></div></div>';
						
						// Add this to the toolbox 
						$('div.toolbox').append(html);
					}
					
					// Add this tool to the existing header
					var toolboxGroupUl = $('.toolbox .' + group + ' ul');
					var style = (tool.hasOwnProperty('colour') ? tool.colour : getColourCSS (i, _toolboxObjects.length))
					$(toolboxGroupUl).append (
						`<li data-tool="${tool.type}" style="background-color: ${style}; color: white;"><i class="fa ${tool.icon}"></i><p>${tool.prettyName}</p></li>`
					);
				});
			});

			// Generate random colour for tools
			function getColourCSS (i, length) {
				const randomInt = function (min, max) {
					return Math.floor(Math.random() * (max - min + 1)) + min;
				};
				var h = randomInt(0, 360);
				var s = randomInt(42, 98);
				var l = randomInt(30, 50);
				return `hsl(${h},${s}%,${l}%)`;
			}
		},


		capitalizeFirstLetter: function (string) 
		{
			return string.charAt(0).toUpperCase() + string.slice(1);
		},


		convertCamelCaseToSentence: function (string){
			return (string
				.replace(/^[a-z]|[A-Z]/g, function(v, i) {
					return (i === 0 ? v.toUpperCase() : " " + v.toLowerCase());
				})
			);
		},


		// Enable toolbox drawers
		toolbox: function ()
		{
			// Ensure correct default position
			$.each($('.toolbox-header'), function (indexInArray, toolboxHeader) {
				
				// If any of these are NOT set to be open
				if (!$(toolboxHeader).hasClass('toolbox-open')) {
					
					// Hide the contents
					$(toolboxHeader).find ('.group-contents').hide ();

					// Add chevron to the right >
					$(toolboxHeader).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(toolboxHeader).find ('.group-contents').show ();

					// Add down chevron, indicating open
					$(toolboxHeader).find ('i').removeClass ('rotated');
				}
			});

			// Enable toolbox headers to be clickable
			$('.toolbox-header > h5').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Enable toolbox chevrons to be clickable
			$('.toolbox-header > i').on ('click', function (event) {
				toggleToolbox (event);
			});
			
			// Function to toggle a toolbox open or closed
			var toggleToolbox = function (event) {
				
				// Get current toolbox drawer status
				var toolboxHeader = $($(event.target)).closest ('.toolbox-header').first();
				var isCurrentlyOpen = $(toolboxHeader).hasClass ('toolbox-open');
				
				// Close action
				if (isCurrentlyOpen) {
					$(toolboxHeader).removeClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().addClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				
				// Open action
				} else {	// If currently closed
					
					// Close any existing first
					$('.toolbox .toolbox-header i').addClass ('rotated');
					$('.toolbox .toolbox-header.toolbox-open .group-contents').slideUp ();
					$('.toolbox .toolbox-header.toolbox-open').removeClass ('toolbox-open');
					
					// Open new current
					$(toolboxHeader).addClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().removeClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				}
			};
			
			// Enable the toolbox card to be closed
			$('.close-card').on ('click', function (){
				hideHelpCard ();
			});

			// Initially, hide the toolbox popup
			$('.toolbox-card').hide ();

			// Hide help card
			function hideHelpCard () {
				$('.toolbox-card').slideUp ();
			}

			// Open help card
			function openHelpCard () {
				$('.toolbox-card').slideDown ();
			}
			
			// Populate help card
			function populateHelpCard (type) {
				var object = _toolboxObjects.find ((o) => o.type === type);

				if (object == 'undefined') {
					return false;
				}
				
				// Populate card
				$('.toolbox-card i.icon').removeClass().addClass('icon fa').addClass(object.icon);
				$('.toolbox-card h1').text(streetvisions.convertCamelCaseToSentence(object.type));
				$('.toolbox-card p').text(object.description);
			}

			// When clicking a tool, populate the help box
			$('.toolbox .group-contents ul li').on ('click', function () {
				var toolType = $(this).data('tool');
				if (!toolType) {
					hideHelpCard();
					return;
				}
				populateHelpCard (toolType);
				openHelpCard ();
			});
		},


		// Helper function to implement settings placeholder substitution in a string
		settingsPlaceholderSubstitution: function (string, supportedPlaceholders)
		{
			// Substitute each placeholder
			var placeholder;
			$.each(supportedPlaceholders, function (index, field) {
				placeholder = '{%' + field + '}';
				string = string.replace(placeholder, _settings[field]);
			});
			
			// Return the modified string
			return string;
		},

	
		// Builder options
		initBuilder: function ()
		{
			// Add geocoder
			var geocoder = function ()
			{
				// Geocoder URL; re-use of settings values is supported, represented as placeholders {%cyclestreetsApiBaseUrl}, {%cyclestreetsApiKey}, {%autocompleteBbox}
				var geocoderApiUrl = streetvisions.settingsPlaceholderSubstitution (_settings.geocoderApiUrl, ['cyclestreetsApiBaseUrl', 'cyclestreetsApiKey', 'autocompleteBbox']);
				
				// Attach the autocomplete library behaviour to the location control
				autocomplete.addTo ('.geocoder input', {
					sourceUrl: geocoderApiUrl,
					select: function (event, ui) {
						var bbox = ui.item.feature.properties.bbox.split(',');	// W,S,E,N
						_map.flyToBounds([
							[bbox[1], bbox[0]],
							[bbox[3], bbox[2]]
						],{
							duration: 2,
							maxZoom: 14
						});						
						
						closeSearchBox();

						event.preventDefault();
					}
				});
			};
			geocoder ();

			// Enable search box
			$('#browse-search-box').on('click', function () {
				$(this).focus();
			});

			$('.geocoder-button').on('click', function () {
				openSearchBox();
			});

			$('.geocoder-button').on('mouseover', function () {
				openSearchBox();
			});

			$('.geocoder-button').on('mouseleave', function () {
				setTimeout(function () {
					if ($('.geocoder input').val() == '') {
						closeSearchBox();
					}
				}, 1500);
			});
			
			var closeSearchBox = function () {
				$('.geocoder input').animate({'width': '20px'});
			};
			
			var openSearchBox = function () {
				$('.geocoder input').animate({'width': '300px'});
				$('#browse-search-box').focus();
			};
			setTimeout(function () {
				openSearchBox();
			}, 1000);
			
			// Set grabbing cursor as soon as the object has been clicked on
			$('.toolbox .group-contents ul li').mousedown (function (e) {
				$(this).css ('cursor', 'grabbing');
			});
			
			// Allow objects to be draggable onto the map
			$('.toolbox .group-contents ul li').draggable ({
				revert: 'invalid',
				stack: '#leaflet',
				start: function (e, ui) {
					// Once we start moving a marker, hide all popups
					Tipped.hideAll();
					
					// Disable the help indicator as user has now dragged onto map
					$('.leafletInstructions').addClass ('hidden');
					
					// Store the toolname
					_draggedTool = $(this);
					var tool = $(this).data('tool');
					_draggedToolObject = _toolboxObjects.find ((o) => (o.type === tool));
					_draggedToolObject.colour = $(this).css('background-color');
					
					// Set the cursor
					$(this).css ('cursor', 'grabbing');
					
					// Add dragging style
					$(this).animate ({'opacity': 0.5});
					
					// Save initial position, to be used to return the item to this position when it's dropped
					_initialToolPosition = $(this).offset();
				},
				stop: function () {
					// Add dragging style
					$(this).animate ({'opacity': 1});
					
					// Reset the cursor
					$(this).css ('cursor', 'pointer');
				}
			});

			// Add map as droppable target
			$('#leaflet').droppable({
				drop: function() {
					// Hide element
					$(_draggedTool).animate ({'opacity': 0}, function () {
						
						// Return the element to the box
						var top = _initialToolPosition.top;
						var left = _initialToolPosition.left;
						$(_draggedTool).animate ({'opacity': 1});
						$(_draggedTool).offset ({top, left});
					});
				}
			});
			
			// Template for the FontAwesome icon to drop onto map
			var fontAwesomeIcon = function () {
				// Get icon of tool that is currently being dragged
				var icon = _draggedToolObject.icon;
				var colour = _draggedToolObject.colour;

				return L.divIcon({
					html: `
					<span class="fa-stack fa-2x">
  						<i class="fas fa-map-marker fa-stack-2x" style="color: ${colour}"></i>
  						<i class="fa ${icon} fa-stack-1x" style="color: white"></i>
					</span>
					`,
					iconSize: [20, 20],
					iconAnchor: L.point(41, 62),
					className: 'leafletFontAwesomeIcon'
				});
			};

			// Check the bounds of a leaflet marker, return bool in/out box
			var checkBounds = function (marker, northEast, southWest) {
    			var bounds = new L.LatLngBounds(
					new L.LatLng(northEast[0], northEast[1]),
					new L.LatLng(southWest[0], southWest[1])
				);
				var markerPosition = marker.getLatLng();
				return bounds.contains(new L.LatLng(markerPosition.lat, markerPosition.lng));
			};
			
			// On drop on map, create an icon
			// Also, create the drag handler for the marker
			var mapdiv = document.getElementById ('leaflet');
			mapdiv.ondrop = function (e) {
				e.preventDefault ();
				
				// Create a new Leaflet Marker
				var coordinates = _map.mouseEventToLatLng (e);
				var id = Date.now().toString();
				var marker = L.marker (coordinates, {
					icon: fontAwesomeIcon (),
					draggable: true,
					uniqueId: id
				});
				
				// Handler for Marker deletion
				marker.deleteMarker = function () {
					_map.removeLayer (marker);
				}
				
				// Handler for Marker move
				marker.streetVisionsId = id;
				marker.on ('move', function (event) {
					// Once we start moving a marker, hide all popups
					Tipped.hideAll();

					// Show the delete target
					$('.deleteTarget').show();

					// If we are dragging the icon to near the border of the map, delete it
					// Get the map bounds
					var bounds = _map.getBounds();
					var northEast = [bounds._northEast.lat-0.001, bounds._northEast.lng-0.001];
					var southWest = [bounds._southWest.lat+0.001, bounds._southWest.lng+0.001];
					
					// Check if the marker is outside those bounds
					if (!checkBounds (marker, northEast, southWest)) {
						// Get the offset of the icon, to send to the puff delete animation
						var offset = getOffset(marker._icon);
						
						// Fade out the icon
						$(this._icon).fadeOut(150, function () {
							// Hide delete target
							$('.deleteTarget').hide();
							
							// Display poof animation
							poofEvent (offset.left, offset.top)
							
							// Delete the marker from Leaflet
							marker.deleteMarker();
						});
					}
					
					// If we are just dragging it around, update the position of the marker
					var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
					_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				});

				// On Marker move end, hide the delete target
				marker.on ('moveend', function () {
					$('.deleteTarget').hide();
				})

				// Show a modal to add description to this marker
				// !TODO check if this is actually one of our toolbox elements being dropped?
				var htmlContent = '<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> ' + _draggedToolObject.prettyName + '</h1><i class="fa fa-times-circle exit-popup"></i>';
				htmlContent += '<hr />';
				htmlContent += '<p>Describe how this element improves the area:</p>';
				htmlContent += '<input class="description" autofocus="autofocus" />';
				htmlContent += `<a data-id="${id}" class="button delete-button"><i class="fa fa-trash-alt"></i></a><a class="button button-general close-popup" data-new="true" data-id="${id}" href="#">Save</a>`;
				
				// Add the marker to the map
				marker.addTo (_map);
				
				// Add custom class to this marker
				$(marker._icon).addClass(id);
				
				// Store this marker in a global object
				_leafletMarkers.push({
					object: _draggedToolObject,
					'id': id
				});
				
				// Update the marker object with current coordinates
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
				_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				
				// Create and display a popup
				Tipped.create ('.' + id, htmlContent, {skin: 'light', hideOthers: true, showOn: 'click', hideOn: false, padding: '20px', size: 'huge', offset: { x: 30, y: 0 }});
				Tipped.show ('.' + id);

				// Give focus to the input box
				$('.tpd-content input').focus();
			};

			// Handler for marker deletion
			$(document).on('click', '.button.delete-button', function (event) {
				var id = $(this).data('id');
				_map.eachLayer((layer) => {
					if (layer.hasOwnProperty('streetVisionsId') && layer.streetVisionsId == id) {
						Tipped.hide('.' + id);
						var offset = getOffset(layer._icon);
						poofEvent (offset.left, offset.top)
						layer.remove();
					}
				});
			});

			// On escape, hide tooltips
			$(document).on('keydown', function(event) {
				if (event.key == "Escape") {
					Tipped.hideAll()
				}
			});

			// Hide deletion target on load
			$('.deleteTarget').hide();
			
			// On map move, hide popups
			_map.on('movestart', function(e) {
				Tipped.hideAll();
			});
			
			// Get the offset of an element
			function getOffset(element) {
				const rect = element.getBoundingClientRect();
				return {
					left: rect.left + window.scrollX,
					top: rect.top + window.scrollY
				};
			}

			// Poof of smoke eye-candy animation
			function animatePoof() {
				var bgTop = 0,
					frame = 0,
					frames = 6,
					frameSize = 32,
					frameRate = 80,
					puff = $('#puff');
				var animate = function () {
					if (frame < frames) {
						puff.css({
							backgroundPosition: "0 " + bgTop + "px"
						});
						bgTop = bgTop - frameSize;
						frame++;
						setTimeout(animate, frameRate);
					}
				};
				animate();
				setTimeout("$('#puff').hide()", frames * frameRate);
			}

			// Controller for the poof event
			var poofEvent = function (left, top) {	
				var xOffset = -20;
				var yOffset = -5;
				$(this).fadeOut('fast');
				$('#puff').css({
					left: left - xOffset + 'px',
					top: top - yOffset + 'px'
				}).show();
				animatePoof();
			};
			
			// When clicking close on a popup box, save the details
			$(document).on ('click', '.close-popup', function (event) {
				saveDetails (this);
			});

			// Helper to save details of a marker
			var saveDetails = function (input) {
				var objectId = $(input).data('id');
				var description = $(input).siblings('.description').first().val();
				
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == objectId));
				_leafletMarkers[markerKey].description = description;

				Tipped.hide('.' + objectId);
				
				// If this was a first-time popup, delete it and add a normal one without the "New marker" title
				if ($(input).data('new')){
					Tipped.remove('.' + objectId);
					var typeOfObject = streetvisions.convertCamelCaseToSentence(_leafletMarkers[markerKey].object.type);
					var html = '';
					html += `<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> ${typeOfObject}</h1><i class="fa fa-times-circle exit-popup"></i>`;
					html += '<hr>';
					html += '<p>Edit this marker in the box below:</p>';
					html += `<textarea class="description" rows="4">${description}</textarea>`;
					html += `<a data-id="${objectId}" class="button delete-button"><i class="fa fa-trash-alt"></i></a><a class="button button-general close-popup" data-new="false" data-id="${objectId}" href="#">Save</a>`;
					Tipped.create('.' + objectId, html, {skin: 'light', size: 'huge', hideOthers: true, offset: { x: 30, y: 0 }});
				}
			};

			// Close popup when pressing enter key
			document.addEventListener('keypress', function (e) {
				if (e.key === 'Enter') {
					if ($(e.target).hasClass ('description')) {
						var input = $(e.target).siblings ('.button').first();
						saveDetails (input);
					}
				}
			});

			// Exit popup without saving
			$(document).on('click', '.exit-popup', function () {
				Tipped.hideAll();
			});
			
			// When clicking on the title bar, make it editable
			$('.builder .title h2, .builder .title h4, .builder p.description').on ('click', function (event){
				makeContentEditable (event.target);
				removeUntitledClass (event.target);
			});
			
			// Select and edit content
			var makeContentEditable = function (target) {
				$(target).attr ('contenteditable','true');
				document.execCommand ('selectAll',false, null);
			};

			// Remove untitled status
			var removeUntitledClass = function (target) {
				// Change the opacity to indicate action
				$(target).removeClass ('untitled');
			};

			// When clicking publish button, check if all fields have been filled in
			$('.publish').on('click', function (event) {
				// Check if all fields have been filled out
				var canPublish = true;
				$.each($('.required'), function (indexInArray, textElement) {
					if ($(textElement).text().includes('Click to add')) {
						canPublish = false;
					}
					if (!canPublish) {return;}
				});

				// If all fields aren't filled out, don't publish
				if (!canPublish) {
					streetvisions.showModal ({
						text: '<i class="fa fa-exclamation"></i> Oops...',
						description: "It seems you haven't filled out all the information we need for this vision yet. Please check you have filled out the title, description, and FAQ questions."
					});
					event.preventDefault();
					return;
				}

				// Gather the questionnaire data into an object
				var questionnaire = [];
				$.each ($('.question'), function (indexInArray, object) {
					questionnaire.push ({
						question: $(object).find('h4').first().text(),
						answer: $(object).find('p').first().text()
					});
				});

				var geojsonFeatures = {
					type: 'FeatureCollection',
					features: _leafletMarkers.map ((marker) => (
						{
							type: 'Feature',
							properties: {
								description: marker.description,
								type: marker.object.type
							},
							geometry: {
								type: 'Point',
								coordinates: [marker.latLng[1], marker.latLng[0]]
							}
						}
					))
				};
				
				// Populate hidden form with stringified object
				$('#name').attr('value', $('.title h2').text());
				$('#description').attr('value', $('.title h4').text());
				$('#components').attr('value', JSON.stringify(geojsonFeatures));
				$('#questionnaire').attr('value', JSON.stringify(questionnaire));
			});
		},


		// Function to display a modal
		showModal: function (modalObject, htmlContent = false, onClick = false)
		{
			if (modalObject) {
				$('.modalBackground h1').html(modalObject.text);
				$('.modalBackground p').text(modalObject.description);
			} else {
				$('.modalContent .innerContent').html (htmlContent);
			}
			
			if (onClick) {
				$(document).on ('click', '.modal .ok-button', function () {
					onClick();
				});
			}

			$('.modalBackground').show();
		},
		
		
		initModal: function ()
		{
			$('.modal .button').on ('click', function () {
				$('.modalBackground').hide();
			});
		},


		// Enable the discussion functionality
		initDiscussion: function ()
		{
			// Ensure correct default position
			$.each($('.discussion-header'), function (indexInArray, discussion) {
				
				// If any of these are NOT set to be open
				if (!$(discussion).hasClass('discussion-open')) {
					
					// Hide the contents
					$(discussion).find ('.answer').hide ();

					// Add chevron to the right >
					$(discussion).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(discussion).find ('.answer').show ();

					// Add down chevron, indicating open
					$(discussion).find ('i').removeClass ('rotated');
				}
			});

			// Enable discussion headers to be clickable
			$('.discussion-header>h5').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Enable discussion chevrons to be clickable
			$('.discussion-header>i').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Function to toggle a discussion open or closed
			var toggleDiscussion = function (event) {
				// Get current discussion drawer status
				var discussionHeader = $($(event.target)).closest ('.discussion-header').first();
				var isOpen = $(discussionHeader).hasClass ('discussion-open');

				if (isOpen) {
					$(discussionHeader).removeClass ('discussion-open');
					$(discussionHeader).find ('i').first ().addClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				} else {
					$(discussionHeader).addClass ('discussion-open');
					$(discussionHeader).find ('i').first ().removeClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				}
			};

			// Handler for creating new discussion topic
			const handleNewDiscussion = function () {
				// Get new discussion topic
				var newTopic = $('.newTopicTitle').val();
				$('.modalBackground').hide();
			};
			
			// Enable a new discussion to be created (display new discussion modal)
			$('.new-topic').on ('click', function () {
				var htmlContent = '<h1><i class="fa fa-plus-circle"></i> New discussion</h1>';
				htmlContent += '<hr>';
				htmlContent += '<p>Please enter a short topic title for this discussion:</p>';
				htmlContent += '<input class="newTopicTitle" placeholder="New topic..." />';
				streetvisions.showModal(false, htmlContent, handleNewDiscussion);
			});
		},

		
		// Initialise the search box
		initSearch: function ()
		{
			$('#search').on ('keyup', function () {
				var value = $(this).val ().toLowerCase ();
				$('.schemes ul li').filter (function () {
					$(this).toggle ($(this).text ().toLowerCase ().indexOf (value) > -1);
				});
			});
		}
	};
	
} (jQuery));
