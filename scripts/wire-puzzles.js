let gameScene = new Phaser.Scene('Game');
      
let config = 
{
    type: Phaser.AUTO, // Phaser will decide how to render (WebGL or Canvas)
    width: 1280,
    height: 720,
    scene: gameScene,
    pixelArt: true,
    // canvas: document.getElementById('game-canvas')
    parent: 'canvas-container'
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
    this.keys = {}
    let key = '';
    for (var i = 0; i < keysToRemember.length; i++) 
    {
        // keysToRemember[i]
        // key = keysToRemember[i]
        // keyCodesToRemember[key] =  Phaser.Input.Keyboard.KeyCodes[key];
        this.keys[keysToRemember[i]] = 
        {
            isDown: false,
            keyCode: Phaser.Input.Keyboard.KeyCodes[keysToRemember[i]]
        }
    }

    this.input.keyboard.on('keydown', function (e) 
    {
        for(var keyName in gameScene.keys)
        {
            if (gameScene.keys[keyName].keyCode === e.keyCode) 
            {
                gameScene.keys[keyName].isDown = true;
                if (keyName === 'DOWN')
                break;
            }
        }
    });
    this.input.keyboard.on('keyup', function (e) 
    {
        for(var keyName in gameScene.keys)
        {
            if (gameScene.keys[keyName].keyCode === e.keyCode) 
            {
                gameScene.keys[keyName].isDown = false;
                break;
            }
        }
    });
    // this.keys = this.input.keyboard.addKeys(keyCodesToRemember);

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
    this.drawTile = TILES.wall;
    var poweredWireTiles = this.map.addTilesetImage('powered wire tiles');
    var unpoweredWireTiles = this.map.addTilesetImage('unpowered wire tiles');
    var whiteWireTiles = this.map.addTilesetImage('white wire tiles');

    var ground = this.map.createBlankDynamicLayer('room', roomTileset);
    var wires = this.map.createBlankDynamicLayer('wires', whiteWireTiles);
    for (var x = 0; x < this.map.width; x ++)
    {
        for (var y = 0; y < this.map.height; y ++)
        {
            var tile = ( x === 0 || y === 0 || x === this.map.width - 1 || y === this.map.height - 1 ) ? new Wall(x, y) : new Floor(x, y);
            tile.addToLayer();
        }
    }
    // ground.fill(1);
    // ground.fill(0, 1, 1, this.map.width-2, this.map.height-2);

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
    var tile = makeTileFromIndex(this.drawTile, x, y);
    tile.addToLayer();
    // this.map.putTileAt(this.drawTile, x, y, false, 'room');
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
        if (tiles[i].index === TILES.hardTWall) tiles[i].index = TILES.softTWall;
        else if (tiles[i].index === TILES.softTWall) tiles[i].index = TILES.hardTWall;
    }
}

gameScene.exportLevel = function ()
{
    var name = document.getElementById('level-name').value;
    name = (name !== '') ? name : 'level';
    var level = {
        name: name,
        width: gameScene.map.width,
        height: gameScene.map.height,
        wires: [],
        room: []
    };

    for (var y = 0; y < level.height; y ++)
    {
        level.wires.push([]);
        level.room.push([]);
        for (var x = 0; x < level.width; x ++)
        {
            var tile = this.map.getTileAt(x, y, null, 'wires');
            level.wires[y][x] = (tile === null) ? -1 : tile.getData();

            var tile = this.map.getTileAt(x, y, null, 'room');
            level.room[y][x] = (tile === null) ? -1 : tile.getData();
        }
    }

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(level));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", name + ".lvl");
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

gameScene.importLevel = function()
{
    var fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.onchange = function () 
    {
        var reader = new FileReader();
        reader.onload = function(e) {
            var level = JSON.parse(e.target.result);
            console.log(level);
            gameScene.loadLevel(level);
        }
        reader.readAsText(fileInput.files[0]);
        fileInput.remove();
    };
    fileInput.click();
}

gameScene.loadLevel = function(level) 
{
    for (var y = 0; y < level.height; y ++)
    {
        for (var x = 0; x < level.width; x ++)
        {
            var tile;
            if (level.wires[y][x] !== -1) {
                tile = new Wire(x, y);
                tile.addToLayer();
            }
            if (level.room[y][x] !== -1) {
                tile = makeTileFromIndex(level.room[y][x], x, y);
                tile.addToLayer();
            }
        }
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
        if (tile === null || tile.isSolid) return;

        this.directionMoving = dir;
        this.x += this.speed*dx;
        this.y += this.speed*dy;
    }
    
});