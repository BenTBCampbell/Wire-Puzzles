let gameScene = new Phaser.Scene('Game');
      
let config = {
    type: Phaser.AUTO, // Phaser will decide how to render (WebGL or Canvas)
    width: 1280,
    height: 720,
    scene: gameScene,
    pixelArt: true
};

let game = new Phaser.Game(config);


//set parameters
gameScene.init = function() {
    this.playerSpeed = 3;
    this.enemySpeed = 2;
    this.enemyMaxY = 280;
    this.enemyMinY = 80;
    this.tileScale = 4;
    this.tileSize = 16;//in pixels
    this.tilePlaceCooldown = 20;
    this.timeSinceTilePlaced = this.tilePlaceCooldown;
    this.previousSelectedTilePos = {x: 0, y: 0};
    this.mapWidth = 10;
    this.mapHeight = 8;
}


//load game assets
gameScene.preload = function() {
    this.load.image('room tiles',           'images/room-tiles.png');
    this.load.image('powered wire tiles',   'images/powered-wire-tiles.png');
    this.load.image('unpowered wire tiles', 'images/unpowered-wire-tiles.png');
    this.load.image('white wire tiles', 'images/white-wire-tiles.png');
    this.load.image('player', 'images/player.png');
};


//executed once after preload. Used to set up game entities.
gameScene.create = function() {

    //keyboard
    let keyCodes = Phaser.Input.Keyboard.KeyCodes;
    let keysToRemember = ['W', 'S', 'A', 'D', 'Q', 'E', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'];
    let keyCodesToRemember = {};
    let key = '';
    for (var i = 0; i < keysToRemember.length; i++) {
        key = keysToRemember[i]
        keyCodesToRemember[key] =  Phaser.Input.Keyboard.KeyCodes[key];
    }
    this.keys = this.input.keyboard.addKeys(keyCodesToRemember);

    //colors
    this.colors = {
        powered_blue: Phaser.Display.Color.GetColor(232,143,61),
        unpowered_blue: Phaser.Display.Color.GetColor(166,72,44)
    }

    //camera controls
    let cam = this.cameras.main;
    cam.setBackgroundColor(0x555555);
    // this.cameras.main.setZoom(4);
    // this.cameras.main.setScroll(-config.width, -config.height);

    var controlConfig = {
        camera: this.cameras.main,
        left: this.keys.LEFT,
        right: this.keys.RIGHT,
        up: this.keys.UP,
        down: this.keys.DOWN,
        speed: 0.5,
        zoomOut: this.keys.Q,
        zoomIn: this.keys.E
    };

    // this.camControls = new Phaser.Cameras.Controls.Fixed(controlConfig);

    //tilemap
    this.map = this.make.tilemap({
        tileWidth: this.tileSize,
        tileHeight: this.tileSize,
        width: this.mapWidth,
        height: this.mapHeight 
    });

    var roomTiles = this.map.addTilesetImage('room tiles');
    var poweredWireTiles = this.map.addTilesetImage('powered wire tiles');
    var unpoweredWireTiles = this.map.addTilesetImage('unpowered wire tiles');
    var whiteWireTiles = this.map.addTilesetImage('white wire tiles');

    var ground = this.map.createBlankDynamicLayer('room', roomTiles);
    var wires = this.map.createBlankDynamicLayer('wires', whiteWireTiles);
    ground.fill(1);
    ground.fill(0, 1, 1, this.map.width-2, this.map.height-2);

    this.mapScaleGroup = this.add.group();
    this.mapScaleGroup.add(ground);
    this.mapScaleGroup.add(wires);
    Phaser.Actions.ScaleXY(this.mapScaleGroup.getChildren(), this.tileScale, this.tileScale);

    this.marker = this.add.graphics();
    this.marker.lineStyle(3, 0x000000, 1);
    this.marker.strokeRect(0, 0, this.map.tileWidth*(this.tileScale+1), this.map.tileHeight*(this.tileScale+1));

    //player
    this.player = this.add.sprite(this.map.tileToWorldX(2.5), this.map.tileToWorldY(2.5), 'player');
    this.player.setScale(this.tileScale+1);
    this.player.moveDirection = '';
    this.player.speed = this.playerSpeed;

    this.player.update = function() {
        // console.log(this.directionMoving);
        let tileX = this.scene.map.tileToWorldX(this.scene.map.worldToTileX(this.x)+0.5);
        let tileY = this.scene.map.tileToWorldY(this.scene.map.worldToTileY(this.y)+0.5);
        if (this.x !== tileX) {
            let dx = Math.min(this.speed, Math.abs(tileX - this.x));
            dx *= (this.directionMoving === 'E') ? -1 : 1;
            this.x += dx;
        }
        else if (this.y !== tileY) {
            let dy = Math.min(this.speed, Math.abs(tileY - this.y));
            dy *= (this.directionMoving === 'N') ? -1 : 1;
            this.y += dy;
        }
        else if (this.x === tileX && this.y === tileY) this.directionMoving = '';
        // if (this.directionMoving === 'N') {
        //     if(this.x != tileX)
        // }
    }

    this.player.move = function(dir) {
        if (this.directionMoving !== '') return;
        let dx = 0;
        let dy = 0;
        if      (dir === 'N') dy = -1;
        else if (dir === 'S') dy = 1;
        else if (dir === 'E') dx = -1;
        else if (dir === 'W') dx = 1;
        else return;//invalid dir

        let tileX = this.scene.map.worldToTileX(this.x)+dx;
        let tileY = this.scene.map.worldToTileY(this.y)+dy;
        let tile =this.scene.map.getTileAt(tileX, tileY, true, 'room');
        if (tile === null || tile.index === 1) return; //will hit wall;

        this.directionMoving = dir;
        this.x += this.speed*dx;
        this.y += this.speed*dy;
    };

};


gameScene.update = function(time, delta) {

    if (this.keys.Q.isDown) {
        this.map.forEachTile(function(tile) {
            if (tile.index === -1) return;
            // console.log(tile);
            // tile.tint += 100;
            console.log(tile.tint);
        });
    }

    // this.camControls.update(delta);

    var mousePos = this.input.activePointer.positionToCamera(this.cameras.main);
    //get world coords of tile mouse is in.
    var mouseTileX = this.map.worldToTileX(mousePos.x);
    var mouseTileY = this.map.worldToTileY(mousePos.y);
    this.marker.x = this.map.tileToWorldX(mouseTileX);
    this.marker.y = this.map.tileToWorldY(mouseTileY);

    if(this.previousSelectedTilePos.x != mouseTileX || this.previousSelectedTilePos.y != mouseTileY) this.timeSinceTilePlaced = this.tilePlaceCooldown;
    this.previousSelectedTilePos.x = mouseTileX;
    this.previousSelectedTilePos.y = mouseTileY;

    //place wire
    if (this.input.manager.activePointer.isDown) this.toggleWallAt(mouseTileX, mouseTileY);
    this.timeSinceTilePlaced += 1;

    //move player
    this.player.update();
    if (this.keys.SPACE.isDown && this.player.directionMoving === '' && this.timeSinceTilePlaced >= this.tilePlaceCooldown) {
        this.toggleWireAt(this.map.worldToTileX(this.player.x), this.map.worldToTileY(this.player.y));
        this.timeSinceTilePlaced = 0;
    }
    if (this.keys.UP.isDown || this.keys.W.isDown) this.player.move('N');
    else if (this.keys.DOWN.isDown || this.keys.S.isDown) this.player.move('S');
    else if (this.keys.LEFT.isDown || this.keys.A.isDown) this.player.move('E');
    else if (this.keys.RIGHT.isDown || this.keys.D.isDown) this.player.move('W');
};

gameScene.toggleWallAt = function (x, y) {
    if (this.timeSinceTilePlaced <= this.tilePlaceCooldown) return;
    let tile = this.map.getTileAt(x, y, true, 'room');
    if (tile.index == 1) this.map.putTileAt(0, x, y, false, 'room');
    else this.map.putTileAt(1, x, y, false, 'room');
    this.timeSinceTilePlaced = 0;
};

gameScene.toggleWireAt = function(x, y) {
    if (this.map.getTileAt(x, y) != null) this.map.putTileAt(-1, x, y, false, 'wires');
    else {
        this.map.putTileAt(0, x, y, false, 'wires').tint = this.colors.unpowered_blue;
        // this.map.getTileAt(x, y).tint = Phaser.Display.Color.GetColor(232,143,61);
    }
    this.updateWireAt(x, y);
    this.updateWireAt(x+1, y);
    this.updateWireAt(x-1, y);
    this.updateWireAt(x, y+1);
    this.updateWireAt(x, y-1);
};

gameScene.updateWireAt = function(x, y) {
    if (this.map.getTileAt(x, y) === null) return;
    
    var tileDirs = {
        '': 0,
        'N': 1,   'S': 1,    'NS': 1,
        'E': 2,   'W': 2,    'EW': 2,
        'ES': 3,  'ESW': 4,  'SW': 5,
        'NES': 6, 'NESW': 7, 'NSW': 8,
        'NE': 9,  'NEW': 10, 'NW': 11
    }
    
    var neighborWires = '';
    if (this.map.getTileAt(x, y-1) != null) neighborWires += 'N';
    if (this.map.getTileAt(x+1, y) != null) neighborWires += 'E';
    if (this.map.getTileAt(x, y+1) != null) neighborWires += 'S';
    if (this.map.getTileAt(x-1, y) != null) neighborWires += 'W';
    
    var tileId = tileDirs[neighborWires];
    if (tileId == undefined) tileId = 0;
    
    this.map.putTileAt(tileId, x, y, false, 'wires');
};