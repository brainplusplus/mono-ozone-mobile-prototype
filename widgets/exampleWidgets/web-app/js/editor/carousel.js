$(document).ready(function() {


$("#templates").carouFredSel({
	circular: false,
	infinite: false,
	width: "variable",
	height: "auto",
	items: {
		visible: 2,
		minimum: 1
	},
	auto: false,
	prev: {
		button: ".prev",
		key: 74
	},
	next: {
		button: ".next",
		key: 75
	}
});
});

