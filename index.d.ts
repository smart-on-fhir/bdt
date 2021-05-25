declare type Except<ObjectType, KeysType extends keyof ObjectType> = Pick<
    ObjectType,
    Exclude<keyof ObjectType, KeysType>
>

declare type Merge<FirstType, SecondType> = Except<
    FirstType,
    Extract<keyof FirstType, keyof SecondType>
> & SecondType;

declare namespace BDT {
    
}

export = BDT
export as namespace BDT