<g:if test="${it.title}">
	<div class="tile-presentation" id="${it.id}">
		<img src="/presentationGrails/images/img-presentation.png"
			alt="CJCS Daily Intel Brief" class="th-presentation"
			onclick="window.location='${createLink(uri: '/')}${linkDestination}?id=${it.id}'">
		<div class="blob-ellipsis"
			onclick="window.alert('test');return false;">
			<i class="icon-ellipsis-vertical"></i>
		</div>
		<div class="slides">
			${it.slides?.size()}
		</div>
        <div class="delete">
            <a href='#' onclick="deletePresentation('${it.id}')"><i class="icon-cancel-squared"></i></a>
        </div>
		<div class="title">
			<div class="text" onclick="window.location='${createLink(uri: '/')}editor/edit?id=${it.id}'">
				${it.title.take(30)}<g:if test="${it.title.size() > 30 }">...</g:if>
			</div>
			<div class="text-state">
				${it.state }
			</div>
			<div class="text-project">CJCS Daily Intel Brief</div>
		</div>
	</div>
</g:if>

