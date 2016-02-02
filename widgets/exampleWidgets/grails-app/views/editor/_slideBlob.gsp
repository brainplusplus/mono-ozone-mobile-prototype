
<li>
	<div class="slide-title cursor-pointer"
		onclick="savePresentation(function(){editSlide(${it.slideNum}, ${it.presentation.id }, function(){$('#panel').slideToggle();});})">
		<img src="../images/img-slide.png" alt="CJCS Daily Intel Brief"
			style="z-index: -1; float: left; margin-right: 20px;">
		<div class="slide-number">
			${it.slideNum}
		</div><span id="slideTitle-${it.slideNum}">
		<g:if test="${it.title}">${it.title}</g:if><g:else>Type your slide title</g:else></span>
	</div>
</li>