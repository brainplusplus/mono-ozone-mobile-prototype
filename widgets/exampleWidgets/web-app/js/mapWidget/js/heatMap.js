/************************************
 * Heat map         		        *
 ***********************************/
function Heatmap(options) {
    this.options = $.extend({
        cols: 10,
        rows: 10,
        width: 400,
        height: 300,
        radiusMultiplier: 3,
        firstOpacityStop: 0.3,
        secondOpacityStop: 0.6,
        minThreshold: null,
        maxThreshold: null
    }, (options || {}));
//    this.points = [];    

    //map gradient
    var gr = document.createElement("canvas");
    gr.width = 255;
    gr.height = 1;
    var grcl = gr.getContext('2d');
    grcl.rect(0, 0, gr.width, gr.height);
    this.gradientContext = grcl;

    var grd = grcl.createLinearGradient(0, 0, gr.width, gr.height);
    grd.addColorStop(0, 'transparent');
    grd.addColorStop(.18, '#2cd4dd');
    grd.addColorStop(.36, '#30f226');
    grd.addColorStop(.54, '#eff927');
    grd.addColorStop(.72, '#d34128');
    grd.addColorStop(.9, '#ffffff');
    grcl.fillStyle = grd;
    grcl.fill();
    this.gradient = grcl.getImageData(0, 0, gr.width, gr.height);
    
    this.initBuckets = function(){
    	this.buckets = [];
        this.xmul = this.options.width / this.options.cols;
        this.ymul = this.options.height / this.options.rows;
        this.biggest_bucket = 1;
        for (var i = 0; i < this.options.rows * this.options.cols; i++) {
            this.buckets[i] = [];
        }
    };
    
    this.initBuckets();
};

Heatmap.prototype.hash = function (point) {
    return this.options.rows * Math.floor(point.x / this.xmul) + Math.floor(point.y / this.ymul);
};

Heatmap.prototype.add = function (point) {
//	this.points.push(point);
    this.addBucketHash(point);
};

Heatmap.prototype.addBucketHash = function (point) {
    if (point.x <= this.options.width && point.y <= this.options.height) {
        this.buckets[this.hash(point)].push(point);
        this.biggest_bucket = Math.max(this.biggest_bucket, this.buckets[this.hash(point)].length);
    }
};

Heatmap.prototype.clear = function(){
//	this.points = [];
	this.initBuckets();
}

Heatmap.prototype.resize = function(width, height){
	this.options.width = width;
	this.options.height = height;
	this.initBuckets();
	
//	for(var i=0; i<this.points.length;i++){
//		this.addBucketHash(this.points[i]);
//	}
};

Heatmap.prototype.mapPixel = function (opacity) {
    var pos = Math.floor(opacity * 4);
    return [this.gradient.data[pos], this.gradient.data[pos + 1], this.gradient.data[pos + 2], this.gradient.data[pos + 3]];
};

Heatmap.prototype.drawRectangles = function (context) {
    for (var i = 0; i < this.buckets.length; i++) {
        for (var i2 = 0; i2 < this.buckets[i].length; i2++) {
            context.beginPath();
            context.fillStyle = "#cccccc";
            context.globalAlpha = 0.1;
            context.lineWidth = 2;
            context.fillRect(Math.floor(i / this.options.cols) * this.xmul, i % this.options.cols * this.ymul, this.xmul, this.ymul);
        }
    }
};

Heatmap.prototype.drawCircles = function (context) {
    for (var i = 0; i < this.buckets.length; i++) {
        for (var i2 = 0; i2 < this.buckets[i].length; i2++) {
            var cx = Math.floor(i / this.options.cols) * this.xmul + (this.xmul / 2);
            var cy = i % this.options.cols * this.ymul + (this.ymul / 2);
            context.beginPath();
            var rad = this.options.radiusMultiplier * (this.xmul / 2);
            if (this.options.minThreshold != null && this.options.maxThreshold != null) {
                if (this.buckets[i].length >= this.options.minThreshold) {
                    rad *= (Math.min(this.buckets[i].length / this.options.maxThreshold, 1));
                } else rad = 0;
            } else rad = rad * this.buckets[i].length / this.biggest_bucket;
            context.arc(cx, cy, rad, 0, Math.PI * 2, true);
            context.closePath();
            // create radial gradient
            var grd = context.createRadialGradient(cx, cy, 1, cx, cy, rad);
            grd.addColorStop(0, '#000000');
            grd.addColorStop(this.options.firstOpacityStop, 'rgba(0,0,0,200');
            grd.addColorStop(this.options.secondOpacityStop, 'rgba(0,0,0,50)');

            grd.addColorStop(1, 'rgba(0,0,0,0)');
            context.globalAlpha = 0.1;
            context.fillStyle = grd;
            context.fill();
        }
    }
};

Heatmap.prototype.translateToGradient = function (context) {
    var imgData = context.getImageData(0, 0, this.options.width, this.options.height);
    for (var i = 0; i < imgData.data.length; i += 4) {
        var s = this.mapPixel(imgData.data[i + 3]);
        imgData.data[i] = s[0];
        imgData.data[i + 1] = s[1];
        imgData.data[i + 2] = s[2];
        imgData.data[i + 3] = s[3];
    }
    context.putImageData(imgData, 0, 0);
};

Heatmap.prototype.draw = function (context, rectangles) {
    context.clearRect(0, 0, this.options.width, this.options.height);
    if (rectangles) this.drawRectangles(context);
    else this.drawCircles(context);
    this.translateToGradient(context);
};