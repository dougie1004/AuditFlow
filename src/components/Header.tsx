

const Header = () => {
    return (
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Dashboard</h2>
            </div>

            <div className="flex items-center gap-4">
                <button className="text-sm text-muted-foreground hover:text-foreground">Notifications</button>
                <button className="text-sm text-muted-foreground hover:text-foreground">Help</button>
            </div>
        </header>
    );
};

export default Header;
