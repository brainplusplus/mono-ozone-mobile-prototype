package com.fourtwosix.mono.data.services;

import com.fourtwosix.mono.data.models.IDataModel;

import java.util.List;

public interface IDataService<T extends IDataModel> {
    public interface DataModelSearch<S> {
        boolean search(S param);
    }

    public Iterable<T> list();
    public T find(String guid);
    public List<T> find(DataModelSearch<T> matcher);
    public int size();
    public void put(T it);
    public void put(Iterable<T> list);
    public void remove(T it);
    public void sync();
}
