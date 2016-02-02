/*
 * File to put common javascript code shared between the viewer and editor 
 */

/**
 * Sends an intent with the specified hash tag value
 */
function sendHashtagSearchIntent(searchText) {
	if (typeof OWF !== 'undefined'
		&& typeof OWF.Intents !== 'undefined') {
		// Convert the html codes back to their original
		// characters before sending the intent
		searchText = searchText.replace('&#35;', '#').replace('&#33;', '!').replace('&#64;', '@');
	    OWF.Intents.startActivity(
	      {
	        action:'view',
	        dataType:'text'
	      },
	      {
	        data: [searchText]
	      },
	      function (dest) {
	      }
	    );
	}
}

function filter(type,content)
{

    var query = "";
    if(type == "search")
    {
       query="search?query=" + content;
    }
    else
    {
       query="filter?query=" + content;
    }

    var url = "../presentation/" + query
    $.ajax({url: url}).done(function(data) {
                            var evaluated = eval(data)
                          if(evaluated.length>0)
                          {
                            $(evaluated.join(', ')).fadeOut();
                          }
                        })


}

function deletePresentation(presentationId)
{
    var url = "../presentation/delete?id=" + presentationId;
     $.ajax({url: url}).done(function() {
                                   $('#' + presentationId).remove();
                            })
}

function deleteSlide(presentationId,slideNum)
{
    var url = "../presentation/deleteSlide?presentationId=" + presentationId + "&slideNum=" + slideNum;
    $.ajax({url: url}).done(function() {
                                       alert("oh crap, what now?");
                                })
}