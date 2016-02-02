var editor = (function() {

	// Editor elements
	var headerField, contentField, cleanSlate, lastType, currentNodeList, savedSelection;

	// Editor Bubble elements
	var textOptions, optionsBox, boldButton, italicButton, quoteButton, urlButton, urlInput, backgroundInfo, strikethrough;


	function init() {

		lastRange = 0;
		bindElements();

		// Set cursor position
		/*var range = document.createRange();
		var selection = window.getSelection();
		range.setStart(headerField, 1);
		selection.removeAllRanges();
		selection.addRange(range);*/

		createEventBindings();

		// Load state if storage is supported
		if ( supportsHtmlStorage() ) {
			loadState();
		}
	}

	function createEventBindings( on ) {

		// Key up bindings
		if ( supportsHtmlStorage() ) {

			document.onkeyup = function( event ) {
				checkTextHighlighting( event );
				saveState();
			}

		} else {
			document.onkeyup = checkTextHighlighting;
		}

		// Mouse bindings
		document.onmousedown = checkTextHighlighting;
		document.onmouseup = function( event ) {

			setTimeout( function() {
				checkTextHighlighting( event );
			}, 1);
		};
		
		// Window bindings
		window.addEventListener( 'resize', function( event ) {
			updateBubblePosition();
		});

		// Scroll bindings. We limit the events, to free the ui
		// thread and prevent stuttering. See:
		// http://ejohn.org/blog/learning-from-twitter
		var scrollEnabled = true;
		document.body.addEventListener( 'scroll', function() {
			
			if ( !scrollEnabled ) {
				return;
			}
			
			scrollEnabled = true;
			
			updateBubblePosition();
			
			return setTimeout((function() {
				scrollEnabled = true;
			}), 250);
		});
	}

	function bindElements() {
		//adding in try catches in order to help keep the editor flexible
		/*
		tryBind(function() {
			headerField = document.querySelector( '.header' );
		});
		 */
		
		tryBind(function() {
			contentField = document.querySelector( '.content' );
			textOptions = document.querySelector( '.text-options' );	
		});
		
		tryBind(function() {
			optionsBox = textOptions.querySelector( '.options' );	
		});
		
		tryBind(function() {
			boldButton = textOptions.querySelector( '.bold' );
			boldButton.onclick = onBoldClick;	
		});
		
		tryBind(function() {
			italicButton = textOptions.querySelector( '.italic' );
			italicButton.onclick = onItalicClick;	
		});
		
		tryBind(function() {
			quoteButton = textOptions.querySelector( '.quote' );
			quoteButton.onclick = onQuoteClick;	
		});
		
		tryBind(function() {
			urlButton = textOptions.querySelector( '.url' );
			urlButton.onmousedown = onUrlClick;
		
			urlInput = textOptions.querySelector( '.url-input' );
			urlInput.onblur = onUrlInputBlur;
			urlInput.onkeydown = onUrlInputKeyDown;			
		});

		tryBind(function() {
			backgroundInfo = textOptions.querySelector( '.background');
			backgroundInfo.onclick = onBackgroundClick;	
		});
		
		/*tryBind(function() {
			strikethrough = textOptions.querySelector( '.strikethrough');
			strikethrough.onclick = onStrikethroughClick;	
		});*/
	}
	
	function tryBind(fn) {
		try {
			fn();
		} catch(e) {
			
		}
	}

	function checkTextHighlighting( event ) {

		var selection = window.getSelection();

		if ( event
				&& event.target
				&& ((event.target.className && event.target.className === "url-input") ||
		     (event.target.classList && event.target.classList.contains( "url" )) ||
		     (event.target.parentNode && event.target.parentNode.classList && event.target.parentNode.classList.contains( "ui-inputs"))) ) {

			currentNodeList = findNodes( selection.focusNode );
			updateBubbleStates();
			return;
		}

		// Check selections exist
		if ( selection.isCollapsed === true && lastType === false ) {

			onSelectorBlur();
		}

		// Text is selected
		if ( selection.isCollapsed === false ) {

			currentNodeList = findNodes( selection.focusNode );

			// Find if highlighting is in the editable area
			if ( hasNode( currentNodeList, "ARTICLE") ) {
				updateBubbleStates();
				updateBubblePosition();

				// Show the ui bubble
				textOptions.className = "text-options active";
			}
		}

		lastType = selection.isCollapsed;
	}
	
	function updateBubblePosition() {
		var selection = window.getSelection();
		if(selection) {
			var range = selection.getRangeAt(0);
			var boundary = range.getBoundingClientRect();
			
			textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
			textOptions.style.left = (boundary.left + boundary.right)/2 + "px";
		}
	}

	function updateBubbleStates() {

		// It would be possible to use classList here, but I feel that the
		// browser support isn't quite there, and this functionality doesn't
		// warrent a shim.

		if ( hasNode( currentNodeList, 'B') ) {
			boldButton.className = "bold active"
		} else {
			boldButton.className = "bold"
		}

		if ( hasNode( currentNodeList, 'I') ) {
			italicButton.className = "italic active"
		} else {
			italicButton.className = "italic"
		}

		if ( hasNode( currentNodeList, 'BLOCKQUOTE') ) {
			quoteButton.className = "quote active"
		} else {
			quoteButton.className = "quote"
		}

		if ( hasNode( currentNodeList, 'A') ) {
			urlButton.className = "url useicons active"
		} else {
			urlButton.className = "url useicons"
		}
	}

	function onSelectorBlur() {

		textOptions.className = "text-options fade";
		setTimeout( function() {

			if (textOptions.className == "text-options fade") {

				textOptions.className = "text-options";
				textOptions.style.top = '-999px';
				textOptions.style.left = '-999px';
			}
		}, 260 )
	}

	function findNodes( element ) {

		var nodeNames = {};

		while ( element.parentNode ) {

			nodeNames[element.nodeName] = true;
			element = element.parentNode;

			if ( element.nodeName === 'A' ) {
				nodeNames.url = element.href;
			}
		}

		return nodeNames;
	}

	function hasNode( nodeList, name ) {

		return !!nodeList[ name ];
	}

	function saveState( event ) {
		
		//localStorage[ 'header' ] = headerField.innerHTML;
		//localStorage[ 'content' ] = contentField.innerHTML;
	}

	function loadState() {

		//if ( localStorage[ 'header' ] ) {
		//	headerField.innerHTML = localStorage[ 'header' ];
		//}

		//if ( localStorage[ 'content' ] ) {
		//	contentField.innerHTML = localStorage[ 'content' ];
		//}
	}

	function onBoldClick() {
		document.execCommand( 'bold', false );
	}

	function onItalicClick() {
		document.execCommand( 'italic', false );
	}

	function onQuoteClick() {

		var nodeNames = findNodes( window.getSelection().focusNode );

		if ( hasNode( nodeNames, 'BLOCKQUOTE' ) ) {
			document.execCommand( 'formatBlock', false, 'p' );
			document.execCommand( 'outdent' );
		} else {
			document.execCommand( 'formatBlock', false, 'blockquote' );
		}
	}
	
	function onStrikethroughClick() {
		document.execCommand( 'StrikeThrough', true );
	}
	
	function onBackgroundClick() {
		setBackground();
	}

	function onUrlClick() {

		if ( optionsBox.className == 'options' ) {

			optionsBox.className = 'options url-mode';

			// Set timeout here to debounce the focus action
			setTimeout( function() {

				var nodeNames = findNodes( window.getSelection().focusNode );

				if ( hasNode( nodeNames , "A" ) ) {
					urlInput.value = nodeNames.url;
				} else {
					// Symbolize text turning into a link, which is temporary, and will never be seen.
					document.execCommand( 'createLink', false, '/' );
				}

				// Since typing in the input box kills the highlighted text we need
				// to save this selection, to add the url link if it is provided.
				lastSelection = window.getSelection().getRangeAt(0);
				lastType = false;

				urlInput.focus();

			}, 100);

		} else {

			optionsBox.className = 'options';
		}
	}

	function onUrlInputKeyDown( event ) {

		if ( event.keyCode === 13 ) {
			event.preventDefault();
			applyURL( urlInput.value );
			urlInput.blur();
		}
	}

	function onUrlInputBlur( event ) {

		optionsBox.className = 'options';
		applyURL( urlInput.value );
		urlInput.value = '';

		currentNodeList = findNodes( window.getSelection().focusNode );
		updateBubbleStates();
	}

	function applyURL( url ) {

		rehighlightLastSelection();

		// Unlink any current links
		document.execCommand( 'unlink', false );

		if (url !== "") {
		
			// Insert HTTP if it doesn't exist and the starting character is
			// not a '#' symbol which is reserved for special functionality
			if (!url.match("^(http|https)://")) {

				url = "http://" + url;	
			}

			document.execCommand('createLink', false, url );
			
			var anchor = $('a[href="' + url + '"]');
			
			
			if(url.match('^(http|https)://(#|@|!)')) {
				// This is a hashtag search term so let's wire
				// up an onclick to send an intent for other
				// possible widgets to receive the data
				var hashtag = null;
				
				if(anchor.length) {
					// Let's get rid of the prepended http(s):// and change the
					// special characters to use the html character codes because
					// the link has issues saving when the '!' character is there
					hashtag = url.replace('http://', '').replace('https://', '').replace('#', '&#35;').replace('!', '&#33;').replace('@', '&#64;');
					
					// Remove the href attribute and add a custom attribute
					anchor.attr('href', '#');

					// Add the onclick to the html instead of using the jquery
					// .on() or .click() because the viewer uses the html markup
					// and we want the same functionality without having to rewire
					// the click event handler using document ready or the like
					anchor.attr('onclick', 'sendHashtagSearchIntent("' + hashtag + '"); return false;');
				}
			} else {
				anchor.attr("target","_blank");
			}
		}
	}

	function rehighlightLastSelection() {
		window.getSelection().removeAllRanges();
		window.getSelection().addRange( lastSelection );
	}

	function getWordCount() {
		
		var text = get_text( contentField );

		if ( text === "" ) {
			return 0
		} else {
			return text.split(/\s+/).length;
		}
	}

	return {
		init: init,
		saveState: saveState,
		getWordCount: getWordCount
	}

})();