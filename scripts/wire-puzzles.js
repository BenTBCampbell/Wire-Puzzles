let gameScene = new Phaser.Scene('Game');
      
let config = 
{
    type: Phaser.AUTO, // Phaser will decide how to render (WebGL or Canvas)
    width: 1280,
    height: 720,
    scene: gameScene,
    pixelArt: true
};

let game = new Phaser.Game(config);


//set parameters
gameScene.init = function () 
{
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
    this.debugModeEnabled = true;
}


//load game assets
gameScene.preload = function () 
{
    this.load.image('room tiles',           'images/room-tiles.png');
    this.load.spritesheet('room spritesheet', 'images/room-tiles.png', {frameWidth: this.tileSize, frameHeight: this.tileSize});
    this.load.image('powered wire tiles',   'images/powered-wire-tiles.png');
    this.load.image('unpowered wire tiles', 'images/unpowered-wire-tiles.png');
    this.load.image('white wire tiles', 'images/white-wire-tiles.png');
    this.load.image('player', 'images/player.png');
};


//executed once after preload. Used to set up game entities.
gameScene.create = function () 
{

    //keyboard
    let keyCodes = Phaser.Input.Keyboard.KeyCodes;
    let keysToRemember = ['W', 'S', 'A', 'D', 'Q', 'E', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 
                          'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];
    this.numberStrings = {
        'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'ZERO': 0
    }
    let keyCodesToRemember = {};
    let key = '';
    for (var i = 0; i < keysToRemember.length; i++) 
    {
        key = keysToRemember[i]
        keyCodesToRemember[key] =  Phaser.Input.Keyboard.KeyCodes[key];
    }
    this.keys = this.input.keyboard.addKeys(keyCodesToRemember);

    //colors
    this.colors = 
    {
        powered_blue: Phaser.Display.Color.GetColor(232,143,61),
        unpowered_blue: Phaser.Display.Color.GetColor(166,72,44)
    }

    //camera controls
    let cam = this.cameras.main;
    cam.setBackgroundColor(0x555555);
    // this.cameras.main.setZoom(4);
    // this.cameras.main.setScroll(-config.width, -config.height);

    var controlConfig = 
    {
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

    var roomTileset = this.map.addTilesetImage('room tiles');
    this.roomTiles = 
    {
        floor: 0,
        wall: 1,
        output: 2,
        input: 3,
        hardTWall: 4, //toggleable wall
        softTWall: 5
    }
    this.drawTile = this.roomTiles.wall;
    var poweredWireTiles = this.map.addTilesetImage('powered wire tiles');
    var unpoweredWireTiles = this.map.addTilesetImage('unpowered wire tiles');
    var whiteWireTiles = this.map.addTilesetImage('white wire tiles');

    var ground = this.map.createBlankDynamicLayer('room', roomTileset);
    var wires = this.map.createBlankDynamicLayer('wires', whiteWireTiles);
    ground.fill(1);
    ground.fill(0, 1, 1, this.map.width-2, this.map.height-2);

    this.mapScaleGroup = this.add.group();
    this.mapScaleGroup.add(ground);
    this.mapScaleGroup.add(wires);
    Phaser.Actions.ScaleXY(this.mapScaleGroup.getChildren(), this.tileScale, this.tileScale);

    //pick tile gui
    let scaledTileSize = this.tileSize*(this.tileScale+1);
    let mapEdge = this.map.tileToWorldX(this.map.width) + 50;
    var tileSelectGroup = this.add.group([
        {
            key: 'room spritesheet',
            frame: [0, 1, 2],
            setXY: { x: mapEdge, y: 0, stepX: scaledTileSize },
            setScale: { x: this.tileScale+1, y: this.tileScale+1 }
        }, 
        {
            key: 'room spritesheet',
            frame: [3, 4, 5],
            setXY: { x: mapEdge, y: 0+scaledTileSize, stepX: scaledTileSize },
            setScale: { x: this.tileScale+1, y: this.tileScale+1 }
        }
    ]);
    // Phaser.Actions.SetOrigin(tileSelectGroup.getChildren(), 0, 0);
    Phaser.Actions.IncXY(tileSelectGroup.getChildren(), scaledTileSize/2, scaledTileSize/2);
    Phaser.Actions.Call(tileSelectGroup.getChildren(), function (tile) 
    {
        tile.setInteractive();
        tile.on("pointerdown", function (pointer) 
        {
            this.scene.drawTile = this.frame.name;
            this.scene.selectedTileMarker.setPosition(this.getTopLeft().x, this.getTopLeft().y);
            this.scene.markerSprite.setFrame(this.frame.name);
            // this.scene.selectedTileMarker.setPosition(100, 100);
        });
    }, this);

    //markers
    let selectedTileCoords = tileSelectGroup.getChildren()[this.drawTile].getTopLeft();
    this.selectedTileMarker = this.add.graphics();
    this.selectedTileMarker.lineStyle(5, 0x000000, 1);
    this.selectedTileMarker.strokeRect(0, 0, this.map.tileWidth*(this.tileScale+1), this.map.tileHeight*(this.tileScale+1));
    this.selectedTileMarker.setPosition(selectedTileCoords.x, selectedTileCoords.y);

    this.markerSprite = this.add.sprite(0, 0, 'room spritesheet', this.drawTile);
    this.markerSprite.setOrigin(0, 0);
    this.markerSprite.setScale(this.tileScale+1);
    this.markerSprite.setAlpha(0.75);

    //player
    this.player = new Player(this.map.tileToWorldX(2.5), this.map.tileToWorldY(2.5));
    this.add.existing(this.player);
    // this.player = new Phaser.GameObjects.Sprite(gameScene, 0, 0, 'player');

};


gameScene.update = function (time, delta) 
{

    // this.camControls.update(delta);
    for (var string in this.numberStrings) 
    {
        if (this.keys[string].isDown) 
        {
            var frame = this.numberStrings[string]-1;
            this.drawTile = frame;
            // this.scene.selectedTileMarker.setPosition(this.getTopLeft().x, this.getTopLeft().y);
            this.markerSprite.setFrame(frame);
        }
    }

    var mousePos = this.input.activePointer.positionToCamera(this.cameras.main);
    //get world coords of tile mouse is in.
    var mouseTileX = Math.max(Math.min(this.map.worldToTileX(mousePos.x), this.map.width-1), 0);
    var mouseTileY = Math.max(Math.min(this.map.worldToTileY(mousePos.y), this.map.height-1), 0);
    this.markerSprite.x = this.map.tileToWorldX(mouseTileX);
    this.markerSprite.y = this.map.tileToWorldY(mouseTileY);

    if(this.previousSelectedTilePos.x != mouseTileX || this.previousSelectedTilePos.y != mouseTileY) this.timeSinceTilePlaced = this.tilePlaceCooldown;
    this.previousSelectedTilePos.x = mouseTileX;
    this.previousSelectedTilePos.y = mouseTileY;

    //place wire
    if (this.input.manager.activePointer.isDown && 
        this.map.worldToTileX(mousePos.x) < this.map.width && 
        this.map.worldToTileY(mousePos.y) < this.map.height) 
            this.placeRoomTileAt(mouseTileX, mouseTileY);

    this.timeSinceTilePlaced += 1;

    //update wires

    //move player
    this.player.update();
    if (this.keys.SPACE.isDown && this.player.directionMoving === '' && this.timeSinceTilePlaced >= this.tilePlaceCooldown) 
    {
        this.toggleWireAt(this.map.worldToTileX(this.player.x), this.map.worldToTileY(this.player.y));
        this.timeSinceTilePlaced = 0;
    }

    if (this.keys.UP.isDown || this.keys.W.isDown) this.player.move('N');
    else if (this.keys.DOWN.isDown || this.keys.S.isDown) this.player.move('S');
    else if (this.keys.LEFT.isDown || this.keys.A.isDown) this.player.move('E');
    else if (this.keys.RIGHT.isDown || this.keys.D.isDown) this.player.move('W');
};

gameScene.placeRoomTileAt = function (x, y) 
{
    if (this.timeSinceTilePlaced <= this.tilePlaceCooldown) return;
    this.map.putTileAt(this.drawTile, x, y, false, 'room');
    this.timeSinceTilePlaced = 0;
    this.updateWires();
};

gameScene.toggleWireAt = function (x, y) 
{
    this.map.setLayer('wires');
    if (this.map.getTileAt(x, y) != null) 
    {
        this.map.getTileAt(x, y).break();
    }
    else 
    {
        var wire = new Wire(x, y);
        wire.addToLayer();
    }
};

gameScene.updateWires = function () 
{
    var wires = gameScene.map.getTilesWithin(0, 0, undefined, undefined, {isNotEmpty: true}, 'wires');
    for (var i=0; i < wires.length; i++) 
    {
        wires[i].updateConnections();
    }
    for (var i=0; i < wires.length; i++) 
    {
        var checkedTiles = []
        wires[i].powered = wires[i].findPathToPowerSource(checkedTiles);
        wires[i].updateColor();

        if(wires[i].hasNeighboringPowerInput() && wires[i].powered) 
        {
            this.updatePoweredTiles();
        }
    }
}

gameScene.updatePoweredTiles = function () 
{
    var tiles = gameScene.map.getTilesWithin(0, 0, undefined, undefined, {isNotEmpty: true}, 'room');
    for (var i=0; i<tiles.length; i++) 
    {
        if (tiles[i].index === this.roomTiles.hardTWall) tiles[i].index = this.roomTiles.softTWall;
        else if (tiles[i].index === this.roomTiles.softTWall) tiles[i].index = this.roomTiles.hardTWall;
    }
}

var Player = new Phaser.Class({

    Extends: Phaser.GameObjects.Sprite,

    initialize: function(x, y)
    {
        Phaser.GameObjects.Sprite.call(this, gameScene, x, y, 'player');
        this.setScale(gameScene.tileScale+1);
        this.moveDirection = '';
        this.speed = gameScene.playerSpeed;
    },

    update: function () 
    {
        // console.log(this.directionMoving);
        let tileX = this.scene.map.tileToWorldX(this.scene.map.worldToTileX(this.x)+0.5);
        let tileY = this.scene.map.tileToWorldY(this.scene.map.worldToTileY(this.y)+0.5);
        if (this.x !== tileX) 
        {
            let dx = Math.min(this.speed, Math.abs(tileX - this.x));
            dx *= (this.directionMoving === 'E') ? -1 : 1;
            this.x += dx;
        }
        else if (this.y !== tileY) 
        {
            let dy = Math.min(this.speed, Math.abs(tileY - this.y));
            dy *= (this.directionMoving === 'N') ? -1 : 1;
            this.y += dy;
        }
        else if (this.x === tileX && this.y === tileY) 
        {
            this.directionMoving = '';
        }
    },

    move: function (dir) 
    {
        //update all wires
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
        if (tile === null ||
            !(tile.index === this.scene.roomTiles.floor || 
                tile.index === this.scene.roomTiles.softTWall)) return; //will hit wall;

        this.directionMoving = dir;
        this.x += this.speed*dx;
        this.y += this.speed*dy;
    }
    
});

var PuzzleTile = new Phaser.Class({

    Extends: Phaser.Tilemaps.Tile,

    initialize: function (layer, index, x, y) 
    {
        layer = gameScene.map.getLayer(layer);
        Phaser.Tilemaps.Tile.call(this, layer, index, x, y, gameScene.tileSize, gameScene.tileSize);
    },

    addToLayer: function (layer) 
    {
        var l = (layer !== undefined) ? layer : this.layer.name;
        gameScene.map.getLayer(l).data[this.x][this.y] = this;
    }

});

var Wire = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y) 
    {
        PuzzleTile.call(this, 'wires', 0, x, y);

        this.powered = false;
        this.north = false;
        this.south = false;
        this.east = false;
        this.west = false;

        this.connectableTiles = [gameScene.roomTiles.input, gameScene.roomTiles.output];
        this.tileDirectionIndicies = {
            '': 0,
            'N': 1,   'S': 1,    'NS': 1,
            'E': 2,   'W': 2,    'EW': 2,
            'SE': 3,  'SEW': 4,  'SW': 5,
            'NSE': 6, 'NSEW': 7, 'NSW': 8,
            'NE': 9,  'NEW': 10, 'NW': 11
        }

        gameScene.updateWires();
    },

    findPathToPowerSource:  function (checkedTiles) 
    {
        if(checkedTiles.indexOf(this) !== -1) return false;
        if (this.hasNeighboringPowerSource()) return true;
        else {
            checkedTiles.push(this);
            var neighbors = this.getWireNeighbors();
            for (var i=0; i<neighbors.length; i++) 
{
                if (neighbors[i].findPathToPowerSource(checkedTiles)) return true;
            }
        }
        return false;
    },

    isConnectableWith: function (x, y) 
    {
        let tile = this.tilemap.getTileAt(x, y, true, 'wires');
        if (tile.index !== -1) return true;

        tile = this.tilemap.getTileAt(x, y, true, 'room');
        if (this.connectableTiles.indexOf(tile.index) != -1) return true;
        return false;
    },

    getDirectionIndex: function () 
    {
        let dir = '';
        if (this.north) dir += 'N';
        if (this.south) dir += 'S';
        if (this.east) dir += 'E';
        if (this.west) dir += 'W';
        return this.tileDirectionIndicies[dir];
    },

    getWireNeighbors: function () 
{
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'wires');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'wires');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'wires');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'wires');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    getRoomNeighbors: function () 
{
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'room');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'room');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'room');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'room');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    hasNeighboringPowerSource: function () 
{
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
{
            if (neighbors[i].index === gameScene.roomTiles.output) return true;
        }
        return false;
    },

    hasNeighboringPowerInput: function () 
{
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
{
            if (neighbors[i].index === gameScene.roomTiles.input) return true;
        }
        return false;
    },

    break: function () 
{
        this.tilemap.putTileAt(-1, this.x, this.y, null, 'wires');
        gameScene.updateWires();
    },

    updateColor: function () 
{
        //set color
        if (this.powered === true)
            this.tint = gameScene.colors.powered_blue;
        else
            this.tint = gameScene.colors.unpowered_blue;
    },

    updateConnections: function () 
{
        this.north = this.isConnectableWith(this.x, this.y - 1);
        this.south = this.isConnectableWith(this.x, this.y + 1);
        this.east = this.isConnectableWith(this.x + 1, this.y);
        this.west = this.isConnectableWith(this.x - 1, this.y);
        this.index = this.getDirectionIndex();
    }
})